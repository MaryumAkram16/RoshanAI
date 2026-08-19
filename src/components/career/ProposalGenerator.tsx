import React, { useState, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Target, Loader2, Sparkles, UploadCloud, FileText, CheckCircle2, ChevronDown, Check, Copy, Save, Undo2, Redo2, AlertCircle, Edit2, History } from 'lucide-react';
import { callOpenAI, extractTextFromResume, INTEL, S } from '../../App';
import { extractTextFromLocalFile } from '../../utils/fileParser';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useAuth } from '../../contexts/AuthContext';
import { saveProposalToFirebase } from '../../lib/firebase';
import { saveProposal } from '../../userProfile';

interface ProposalResult {
  jobAnalysis: string[];
  skillMatching: {
    directMatches: string[];
    transferableSkills: { skill: string; framing: string; howToDemonstrate?: string }[];
  };
  proposal: string;
  suggestedRate: string;
  rateJustification: string;
  smartQuestions: string[];
}

const PLATFORM_LIMITS: Record<string, number> = {
  'Upwork': 5000,
  'Freelancer': 1500,
  'LinkedIn': 2000,
  'Fiverr': 2500
};

export function ProposalGenerator() {
  const { user, requireAuth } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [inputMethod, setInputMethod] = useState<'manual' | 'resume'>('manual');
  const [dragActive, setDragActive] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeBase64, setResumeBase64] = useState<string | null>(null);
  const { value: resumeText, setValue: setResumeText, undo: undoResumeText, redo: redoResumeText, canUndo: canUndoResumeText, canRedo: canRedoResumeText, reset: resetResumeText } = useUndoRedo<string | null>(null);
  const [showOcrConfirm, setShowOcrConfirm] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);
  const [processingState, setProcessingState] = useState<string>('');
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('proposal_form_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.template) parsed.template = 'concise';
        return parsed;
      } catch (e) {}
    }
    return {
      name: '',
      role: '',
      skills: '',
      platform: 'Upwork',
      projectType: 'Hourly',
      timeline: '1-2 weeks',
      jobDescription: '',
      successMetrics: '',
      template: 'concise' as 'concise' | 'detailed' | 'problem_solution'
    };
  });

  // Save to local storage whenever form changes
  React.useEffect(() => {
    localStorage.setItem('proposal_form_data', JSON.stringify(form));
  }, [form]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProposalResult | null>(null);
  const { value: proposalText, setValue: setProposalText, undo: undoProposal, redo: redoProposal, canUndo: canUndoProposal, canRedo: canRedoProposal, reset: resetProposal } = useUndoRedo<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selection, setSelection] = useState<{ start: number, end: number, text: string } | null>(null);
  const [refining, setRefining] = useState(false);

  const [isEditingRate, setIsEditingRate] = useState(false);
  const [editedRate, setEditedRate] = useState('');

  const handleEditRateStart = () => {
    if (!result) return;
    setEditedRate(result.suggestedRate);
    setIsEditingRate(true);
  };

  const handleEditRateSave = () => {
    if (!result) return;
    const oldRate = result.suggestedRate;
    const newRate = editedRate.trim() || oldRate;
    
    if (oldRate !== newRate) {
      setResult({ ...result, suggestedRate: newRate });
      if (proposalText.includes(oldRate)) {
        const newProposalText = proposalText.split(oldRate).join(newRate);
        setProposalText(newProposalText);
      }
    }
    setIsEditingRate(false);
  };

  const quillRef = useRef<any>(null);

  const handleSelectionQuill = (range: any, source: string, editor: any) => {
    if (range && range.length > 0) {
      const text = editor.getText(range.index, range.length);
      if (text.trim()) {
        setSelection({ start: range.index, end: range.index + range.length, text });
      } else {
        setSelection(null);
      }
    } else {
      setSelection(null);
    }
  };

  const handleSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== end) {
      setSelection({ start, end, text: target.value.substring(start, end) });
    } else {
      setSelection(null);
    }
  };

  const refineSelection = async (action: 'rephrase' | 'expand' | 'shorten') => {
    if (!selection) return;
    setRefining(true);
    
    // We pass the surrounding text to give context, though the prompt itself works fine
    const prompt = `You are an expert freelance proposal writer.
I have a section of a proposal selected:

"${selection.text}"

Please ${action} this selected text to improve the proposal's persuasiveness, brevity, or detail. 
Output ONLY the replacement text for the selection. Do not include quotes around your output unless they are part of the text. Do not add conversational filler or markdown code blocks.`;

    try {
      const revisedText = await callOpenAI(prompt);
      const cleanText = revisedText.replace(/^```\w*\s*/, '').replace(/\s*```$/, '').trim();
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.deleteText(selection.start, selection.end - selection.start);
        editor.insertText(selection.start, cleanText);
      } else {
        const newText = proposalText.substring(0, selection.start) + cleanText + proposalText.substring(selection.end);
        setProposalText(newText);
      }
      setSelection(null);
    } catch (err) {
      console.error(err);
      setError("Failed to refine text.");
    } finally {
      setRefining(false);
    }
  };

  const handleFile = (f: File) => {
    const validExts = ['.pdf', '.docx', '.txt', '.rtf', '.jpeg', '.jpg', '.png'];
    const isImage = f.type.startsWith('image/') || validExts.slice(4).some(ext => f.name.toLowerCase().endsWith(ext));
    
    if (validExts.some(ext => f.name.toLowerCase().endsWith(ext))) {
      setError(null);
      setUploadWarning(isImage ? "Note: Image-based resumes (JPEG/PNG) may result in reduced text extraction accuracy compared to PDFs or DOCX files." : null);
      setFileProcessing(true);
      setFileProgress(10);
      setProcessingState('Extracting text locally...');
      setResumeFile(f);
      setResumeBase64("parsed"); // Placeholder for state check

      extractTextFromLocalFile(f).then(text => {
        setFileProgress(95);
        if(text) {
          resetResumeText(text);
          setShowOcrConfirm(true);
        } else {
          setError("Failed to extract text from resume. Please try again.");
        }
        setFileProgress(100);
        setFileProcessing(false);
        setProcessingState('');
      }).catch(err => {
        setError("Failed to read file.");
        setFileProcessing(false);
        setProcessingState('');
      });
    } else {
      setError("Please upload a PDF, DOCX, TXT, RTF, or Image file.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const copy = () => {
    if (result) {
      navigator.clipboard.writeText(proposalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!result || !user) {
      if (!user) requireAuth("save_proposal", () => {});
      return;
    }
    
    const cleanProposalText = (html: string) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
    };

    setSaveStatus('saving');
    
    // Explicit check for character limit
    const cleanText = cleanProposalText(proposalText);
    const limit = PLATFORM_LIMITS[form.platform] || 5000;
    if (cleanText.length > limit) {
      if (!confirm(`This proposal exceeds the ${form.platform} character limit (${cleanText.length}/${limit}). Do you want to save it anyway?`)) {
        setSaveStatus('idle');
        return;
      }
    }

    const proposalData = {
      jobTitle: form.jobTitle || 'Unknown Job',
      platform: form.platform,
      proposalText: cleanProposalText(proposalText),
      suggestedRate: `${form.currency} ${form.projectType === 'Hourly' ? (form.hourlyRate + '/hr') : form.fixedBudget}`,
      tags: [form.projectType, form.timeline].filter(Boolean) as string[],
    };

    try {
      // 1. Firebase Sync
      await saveProposalToFirebase(user.uid, proposalData);
      
      // 2. Local Record Update
      saveProposal(proposalData);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error("Save failed:", e);
      setSaveStatus('idle');
    }
  };

  const generate = async () => {
    if (inputMethod === 'manual' && (!form.name || !form.role || !form.skills)) {
      setError("Please fill out Name, Role, and Skills for manual entry.");
      return;
    }
    if (inputMethod === 'resume' && (!resumeBase64 || !resumeText)) {
      setError("Please upload and confirm your resume.");
      return;
    }
    if (inputMethod === 'resume' && showOcrConfirm) {
      setError("Please confirm your extracted resume text before generating.");
      return;
    }
    if (!form.jobDescription) {
      setError("Please provide a Job Description to generate a proposal for.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // ── Build freelancer context string ──────────────────────────────────────
    const freelancerContext = inputMethod === 'manual'
      ? `Name: ${form.name}\nRole: ${form.role}\nSkills: ${form.skills}`
      : `Resume:\n${resumeText}`;

    // ── Determine engagement length heuristic from timeline ─────────────────
    const engagementMap: Record<string, string> = {
      '1-2 weeks':   'short-term',
      '3-4 weeks':   'short-term',
      '1-3 months':  'mid-term',
      '3-6 months':  'mid-term',
      '6+ months':   'long-term',
      'Ongoing':     'long-term',
    };
    const engagementLength = engagementMap[form.timeline] ?? 'mid-term';

    // ── Rate baseline by project type ────────────────────────────────────────
    const rateHint = form.projectType === 'Hourly'
      ? 'Suggest a specific hourly rate (e.g. "$35/hr") based on the role seniority and market rates for the region implied by the job post.'
      : 'Suggest a fixed price range (e.g. "$400–$650") based on the project scope described in the job post and the estimated timeline.';

    const templateGuidelines: Record<string, string> = {
      concise: `3. GENERATED PROPOSAL (100–150 words, human natural tone)
   Style: Concise & Direct. Get straight to the point. No fluff.
   a) Opening: lead with a specific credibility signal directly relevant to the client's problem.
   b) Solution Approach: 1–2 highly specific, actionable steps.
   c) Closing: clear, confident call to action.
   Rules:
   - 100–150 words ONLY
   - Zero generic AI filler phrases ("I am passionate", "look no further")`,
      detailed: `3. GENERATED PROPOSAL (250–350 words, human natural tone)
   Style: Detailed & Technical. Emphasize deep expertise and methodology.
   a) Opening: technical hook establishing deep domain expertise.
   b) Architectural/System Understanding: analyze their current state or requirements technically.
   c) Proposed Methodology: detailed breakdown of how you will execute the project.
   d) Closing: professional closing with a technical query.
   Rules:
   - 250–350 words ONLY
   - Focus on technical specifics, zero generic filler`,
      problem_solution: `3. GENERATED PROPOSAL (150–250 words, human natural tone)
   Style: Problem/Solution Focused. Emphasize business impact.
   a) Opening: hook them by deeply acknowledging their core pain point.
   b) The Diagnosis: briefly re-state the cost/risk of the current problem.
   c) The Antidote: how your specific skills solve it efficiently.
   d) Closing: emphasize the end-result/ROI and CTA.
   Rules:
   - 150–250 words ONLY
   - Focus on ROI and solving the underlying pain point. Zero generic filler`
    };

    const selectedTemplateGuideline = templateGuidelines[form.template || 'concise'];
    const platformLimit = PLATFORM_LIMITS[form.platform] || 5000;

    const prompt = `You are an expert freelance proposal generator for ${form.platform}.
Your task is to analyze a job post and generate a high-converting, client-focused proposal for ${form.platform} which has a character limit of ${platformLimit}.

════════════════════════════════════
INPUTS
════════════════════════════════════
Freelancer Info:
${freelancerContext}

Platform: ${form.platform}
Project Type: ${form.projectType}
Target Timeline: ${form.timeline} (${engagementLength})
Success Metrics: ${form.successMetrics || '(not specified — infer from job post)'}
Proposal Style/Template: ${form.template}

Job Description:
"""
${form.jobDescription}
"""

Market context (use only if relevant to the role):
- Trending skills: ${INTEL.trending.join(', ')}

════════════════════════════════════
YOUR TASKS — follow each section strictly
════════════════════════════════════

1. JOB DESCRIPTION ANALYSIS
   - projectScope: 1–2 sentence summary of what the client actually wants built / done
   - keyRequirements: 3–6 bullet strings — concrete deliverables or must-have skills from the JD
   - techStack: array of tech / tools explicitly mentioned or strongly implied (empty array if none)
   - engagementLength: "${engagementLength}" (confirm or correct based on the JD)
   - clientPainPoint: the single deepest pain the client is trying to solve (1 sentence)

2. PROJECT INSIGHTS
   - ${rateHint}
   - estimatedProjectRange: only for Fixed projects — a realistic budget range string (e.g. "$300–$500"); null for Hourly
   - confidenceLevel: "Low" | "Medium" | "High" — how confident you are in the rate based on JD clarity
   - rateJustification: 2–3 precise sentences explaining the rate. You MUST justify it by explicitly mentioning the assessed project scope, tech stack complexity, the seniority level implied by both the client's JD and the freelancer's direct/transferrable skills. Avoid vague statements.

${selectedTemplateGuideline}
   - Write like a senior freelancer who has done this 100 times
   - Every sentence earns its place — cut anything that doesn't add value
   - Incorporate success metrics if provided: ${form.successMetrics || '(none)'}

4. SKILL MATCHING
   - directMatches: skills the freelancer already has that appear explicitly in the JD
   - transferableSkills: array of { skill, framing, howToDemonstrate } — only for skills that are MISSING from the freelancer profile but required by the JD; suggest how to frame adjacent experience

5. SMART CLIENT QUESTIONS (3–5 questions)
   - Must show deep domain expertise — not basic clarifications
   - Each question should probe scope ambiguity, edge cases, success criteria, or technical decisions the client may not have thought through
   - They should make the client think "this person really knows this space"

════════════════════════════════════
RETURN ONLY VALID JSON — NO markdown fences, NO extra text:
════════════════════════════════════
{
  "jobAnalysis": {
    "projectScope": "One clear sentence describing what is being built.",
    "keyRequirements": ["Requirement 1", "Requirement 2", "Requirement 3"],
    "techStack": ["React", "Node.js"],
    "engagementLength": "mid-term",
    "clientPainPoint": "The client needs X because Y is currently broken/slow/missing."
  },
  "projectInsights": {
    "suggestedRate": "$45/hr",
    "estimatedProjectRange": null,
    "confidenceLevel": "High",
    "rateJustification": "The expected tech stack complexity involving microservices and React requires a mid-senior level developer. Given the freelancer's direct matches in React and transferable experience, combined with the 3-month timeline, $45/hr is the optimal competitive alignment."
  },
  "proposal": "Full 150–250 word proposal text here. No section headers. Natural, human tone.",
  "skillMatching": {
    "directMatches": ["React", "TypeScript"],
    "transferableSkills": [
      {
        "skill": "Vue.js experience",
        "framing": "Frame Vue component architecture knowledge as directly applicable to React — same mental model, different syntax.",
        "howToDemonstrate": "Mention your Vue dashboard project and how it used the same unidirectional data flow pattern React uses."
      }
    ]
  },
  "smartQuestions": [
    "Will the API be REST or GraphQL, and do you have a schema already defined or will that be part of the scope?",
    "What does a successful v1 look like — is this replacing an existing tool or a net-new workflow for the team?"
  ]
}`;

    try {
      const response = await callOpenAI(prompt);
      const cleanJSON = response.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleanJSON);
      } catch {
        const match = cleanJSON.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Invalid JSON from OpenAI');
        parsed = JSON.parse(match[0]);
      }

      // ── Normalise into ProposalResult shape ──────────────────────────────
      // Support both the new structured shape and the old flat shape gracefully
      const ja = parsed.jobAnalysis;
      const pi = parsed.projectInsights;

      const normalisedResult: ProposalResult = {
        // jobAnalysis: convert new structured object → array of display strings
        jobAnalysis: Array.isArray(ja)
          ? ja  // old flat array (fallback)
          : [
              ja?.projectScope         ? `📋 Scope: ${ja.projectScope}` : null,
              ja?.clientPainPoint      ? `💡 Core pain: ${ja.clientPainPoint}` : null,
              ...(ja?.keyRequirements  ?? []).map((r: string) => `✓ ${r}`),
              ja?.techStack?.length    ? `🛠 Stack: ${ja.techStack.join(', ')}` : null,
              ja?.engagementLength     ? `⏱ Engagement: ${ja.engagementLength}` : null,
            ].filter(Boolean) as string[],

        skillMatching: parsed.skillMatching ?? { directMatches: [], transferableSkills: [] },

        proposal: parsed.proposal ?? '',

        suggestedRate:
          pi?.suggestedRate
          ?? parsed.suggestedRate
          ?? (form.projectType === 'Hourly' ? '$35/hr' : '$500 Fixed'),

        rateJustification:
          pi?.rateJustification
          ?? parsed.rateJustification
          ?? (pi?.confidenceLevel ? `Confidence: ${pi.confidenceLevel}. ${pi?.estimatedProjectRange ? `Estimated range: ${pi.estimatedProjectRange}.` : ''}` : ''),

        smartQuestions: parsed.smartQuestions ?? [],
      };

      setResult(normalisedResult);
      resetProposal(normalisedResult.proposal);
    } catch (err: any) {
      console.error('[ProposalGenerator] generation error:', err);
      setError('Failed to generate proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={S.mb(28)}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.5rem, 4vw, 1.9rem)', marginBottom: 6 }}>Proposal Generator</h2>
        <p style={{ color: '#8B7355' }}>Drop identical job descriptions or write tailored bids in seconds using AI and your career assets.</p>
      </div>

      <div style={{ ...S.grid2, alignItems: 'flex-start' }}>
        {/* INPUT FORM */}
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: -4 }}>Freelancer Profile</h3>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setInputMethod('manual')}
              style={{ flex: 1, padding: '8px 0', border: '1px solid #E8E0D4', borderRadius: 8, background: inputMethod === 'manual' ? '#F0EBE1' : '#fff', color: '#1A1410', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setInputMethod('resume')}
              style={{ flex: 1, padding: '8px 0', border: '1px solid #E8E0D4', borderRadius: 8, background: inputMethod === 'resume' ? '#F0EBE1' : '#fff', color: '#1A1410', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Upload Resume
            </button>
          </div>

          {inputMethod === 'resume' ? (
            <div>
              <label style={S.label}>Your Resume (PDF, DOCX, TXT, RTF, JPEG, PNG)</label>
              <div 
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => { if(!showOcrConfirm) fileInputRef.current?.click(); }}
                style={{
                  border: `2px dashed ${dragActive ? '#E87C2E' : '#E8E0D4'}`,
                  borderRadius: 12,
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: dragActive ? 'rgba(232,124,46,.05)' : '#FDFAF5',
                  cursor: showOcrConfirm ? 'default' : 'pointer',
                  transition: 'all .2s'
                }}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.rtf,.jpeg,.jpg,.png" onChange={handleChange} style={{ display: 'none' }} />
                {fileProcessing ? (
                  <div style={{ padding: '10px 0' }}>
                    <Loader2 size={32} color="#E87C2E" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{processingState} {fileProgress}%</div>
                    <div style={{ width: '80%', height: 4, background: '#E8E0D4', margin: '8px auto 0', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${fileProgress}%`, height: '100%', background: '#E87C2E', transition: 'width 0.2s ease-out' }} />
                    </div>
                  </div>
                ) : showOcrConfirm ? (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0B7D6E' }}>
                        <CheckCircle2 size={16} /> Text Extracted Successfully
                      </div>
                      <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#8B7355', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>Upload Different File</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={{ fontSize: '0.8rem', color: '#8B7355', margin: 0 }}>Please review and edit the extracted text below to ensure accuracy before generating.</p>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={(e) => { e.stopPropagation(); undoResumeText(); }} disabled={!canUndoResumeText} style={{ ...S.btnGhost, padding: '4px 8px', fontSize: '0.75rem', border: 'none', background: 'transparent', opacity: canUndoResumeText ? 1 : 0.4, cursor: canUndoResumeText ? 'pointer' : 'default' }}><Undo2 size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); redoResumeText(); }} disabled={!canRedoResumeText} style={{ ...S.btnGhost, padding: '4px 8px', fontSize: '0.75rem', border: 'none', background: 'transparent', opacity: canRedoResumeText ? 1 : 0.4, cursor: canRedoResumeText ? 'pointer' : 'default' }}><Redo2 size={16} /></button>
                      </div>
                    </div>
                    <textarea 
                      style={{ ...S.input, minHeight: 200, fontSize: '0.8rem', resize: 'vertical', background: '#fff' }}
                      value={resumeText || ''}
                      onChange={e => setResumeText(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                      <button onClick={(e) => { e.stopPropagation(); setShowOcrConfirm(false); }} style={{ ...S.btnGhost, padding: '6px 16px', fontSize: '0.8rem' }}>Confirm Text</button>
                    </div>
                  </div>
                ) : !resumeFile ? (
                  <>
                    <UploadCloud size={32} color="#8B7355" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>Click or drag to upload</div>
                    <div style={{ fontSize: '0.75rem', color: '#8B7355' }}>Supports Document & Image formats up to 5MB</div>
                  </>
                ) : (
                  <>
                    <FileText size={32} color="#0B7D6E" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0B7D6E', marginBottom: 4 }}>{resumeFile.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#8B7355' }}>Click to replace file or <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowOcrConfirm(true); }} style={{ color: '#0B7D6E' }}>View Extracted Text</a></div>
                  </>
                )}
              </div>
              {uploadWarning && (
                <div style={{ color: '#8B6914', fontSize: '0.85rem', marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 6, background: '#FFFDF0', padding: '10px 12px', borderRadius: 8, border: '1px solid #FFE5B4' }}>
                  <AlertCircle size={16} color="#8B6914" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{uploadWarning}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <label style={S.label}>Your Name</label>
                <input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div>
                <label style={S.label}>Your Role</label>
                <input style={S.input} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Frontend Developer" />
              </div>
              <div>
                <label style={S.label}>Core Skills</label>
                <input style={S.input} value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="React, TypeScript, Node.js" />
              </div>
            </>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #E8E0D4', margin: '4px 0' }} />
          
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: -4 }}>Job Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            <div>
              <label style={S.label}>Target Platform</label>
              <select style={S.input} value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
                {['Upwork', 'Fiverr', 'Freelancer', 'LinkedIn'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Project Type</label>
              <select style={S.input} value={form.projectType} onChange={e => setForm(p => ({ ...p, projectType: e.target.value }))}>
                {['Hourly', 'Fixed', 'Long-Term'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Project Timeline</label>
              <select style={S.input} value={form.timeline} onChange={e => setForm(p => ({ ...p, timeline: e.target.value }))}>
                {['1-2 weeks', '3-4 weeks', '1-3 months', '3-6 months', '6+ months', 'Ongoing'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={S.label}>Key Success Metrics (Optional)</label>
              <input 
                style={S.input} 
                placeholder="e.g., Increase conversion rate by 15%, Deliver MVP in 2 weeks"
                value={form.successMetrics} 
                onChange={e => setForm(p => ({ ...p, successMetrics: e.target.value }))} 
              />
            </div>
            <div>
              <label style={S.label}>Proposal Template</label>
              <select style={S.input} value={form.template || 'concise'} onChange={e => setForm(p => ({ ...p, template: e.target.value as any }))}>
                <option value="concise">Concise & Direct</option>
                <option value="detailed">Detailed & Technical</option>
                <option value="problem_solution">Problem/Solution Focused</option>
              </select>
            </div>
          </div>
          
          <div>
            <label style={S.label}>Job Description</label>
            <textarea 
              style={{ ...S.input, minHeight: 120, resize: 'vertical' }} 
              placeholder="Paste the client's job description here..."
              value={form.jobDescription} 
              onChange={e => setForm(p => ({ ...p, jobDescription: e.target.value }))} 
            />
          </div>

          {error && <div style={{ color: '#E87C2E', fontSize: '0.85rem' }}>{error}</div>}

          <button onClick={generate} disabled={loading} style={{ ...S.btnPri, marginTop: 4 }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />} 
            {loading ? 'Analyzing & Writing...' : 'Generate Proposal'}
          </button>
        </div>

        {/* RESULTS */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', ...S.card }}>
              <Loader2 size={44} style={{ animation: 'spin 1s linear infinite', color: '#E87C2E', margin: '0 auto 16px', display: 'block' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>AI is writing your proposal...</div>
              <div style={{ color: '#8B7355', fontSize: '0.875rem' }}>Analyzing job needs & formatting for {form.platform}</div>
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Analysis & Rate */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div style={S.card}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, color: '#0B7D6E' }}>Job Description Analysis</h4>
                  <ul style={{ paddingLeft: 0, color: '#1A1410', fontSize: '0.85rem', lineHeight: 1.65, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.jobAnalysis.map((point, i) => {
                      const isScope      = point.startsWith('📋');
                      const isPain       = point.startsWith('💡');
                      const isStack      = point.startsWith('🛠');
                      const isReq        = point.startsWith('✓');
                      return (
                        <li key={i} style={{
                          padding: isScope || isPain || isStack ? '8px 12px' : isReq ? '4px 0 4px 10px' : '4px 0',
                          background: isScope ? 'rgba(11,125,110,.06)' : isPain ? 'rgba(232,124,46,.06)' : isStack ? 'rgba(242,201,76,.08)' : 'transparent',
                          borderRadius: isScope || isPain || isStack ? 8 : 0,
                          borderLeft: isReq ? '2px solid #0B7D6E' : 'none',
                          color: isScope ? '#0B7D6E' : isPain ? '#E87C2E' : '#1A1410',
                          fontWeight: isScope || isPain ? 600 : 400,
                        }}>
                          {point}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#8B7355', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                      {form.projectType === 'Hourly' ? 'Suggested Hourly Rate' : 'Suggested Bid'}
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#E87C2E', fontFamily: "'Playfair Display',serif", lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {isEditingRate ? (
                        <input
                          autoFocus
                          value={editedRate}
                          onChange={(e) => setEditedRate(e.target.value)}
                          onBlur={handleEditRateSave}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditRateSave(); }}
                          style={{
                            fontSize: '1.8rem',
                            fontWeight: 800,
                            color: '#E87C2E',
                            fontFamily: "'Playfair Display',serif",
                            textAlign: 'center',
                            border: '1px solid #E8E0D4',
                            borderRadius: 8,
                            padding: '4px 8px',
                            width: '150px',
                            background: '#fff'
                          }}
                        />
                      ) : (
                        <>
                          {result.suggestedRate}
                          <button onClick={handleEditRateStart} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B7355', display: 'flex', alignItems: 'center', padding: 4 }}>
                            <Edit2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {result.rateJustification && (() => {
                    const conf = result.rateJustification.includes('High') ? 'High' : result.rateJustification.includes('Low') ? 'Low' : 'Medium';
                    const confColor = conf === 'High' ? '#0B7D6E' : conf === 'Low' ? '#DC2626' : '#E87C2E';
                    const confBg = conf === 'High' ? 'rgba(11,125,110,.1)' : conf === 'Low' ? 'rgba(220,38,38,.1)' : 'rgba(232,124,46,.1)';
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 12px', borderRadius: 50, background: confBg, color: confColor }}>
                          {conf} Confidence
                        </span>
                        {conf === 'Low' && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.7rem', color: '#DC2626', background: '#FEF2F2', padding: '8px 10px', borderRadius: 6, border: '1px solid #FECACA', width: '100%', boxSizing: 'border-box', textAlign: 'left' }}>
                            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span style={{ lineHeight: 1.4 }}>Rate may be inaccurate due to unclear or missing job details.</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {result.rateJustification && (
                    <div style={{ fontSize: '0.78rem', color: '#5C4B37', lineHeight: 1.55, background: '#FDFAF5', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0D4' }}>
                      {result.rateJustification.replace(/Confidence: (High|Medium|Low)\.\s*/i, '').replace(/Estimated range: [^.]+\.\s*/i, '') || 'Based on scope & project type'}
                    </div>
                  )}
                </div>
              </div>

              {/* Skill Matching Analysis */}
              <div style={{ ...S.card, borderTop: '4px solid #4A90E2' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>Skill Matching Alignment</h4>
                
                {result.skillMatching?.directMatches?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.8rem', color: '#0B7D6E', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Direct Matches</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {result.skillMatching.directMatches.map((skill, i) => (
                        <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(11,125,110,.1)', color: '#0B7D6E', padding: '4px 8px', borderRadius: 6, fontWeight: 500 }}>
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.skillMatching?.transferableSkills?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#E87C2E', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>How to Frame Transferable Skills</div>
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.skillMatching.transferableSkills.map((ts, i) => (
                        <li key={i} style={{ fontSize: '0.85rem', color: '#1A1410', background: '#FDFAF5', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0D4' }}>
                          <span style={{ fontWeight: 600, color: '#1A1410', display: 'block', marginBottom: 4 }}>{ts.skill}</span>
                          <span style={{ color: '#8B7355', lineHeight: 1.5, display: 'block' }}>{ts.framing}</span>
                          {ts.howToDemonstrate && (
                            <span style={{ color: '#5C4B37', lineHeight: 1.5, display: 'block', marginTop: 8, fontStyle: 'italic', fontSize: '0.8rem' }}>
                              <strong>Example:</strong> {ts.howToDemonstrate}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Proposal Text */}
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>General Proposal</h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', background: '#F0EBE1', borderRadius: 8, padding: '2px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8B7355', margin: '0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <History size={12} /> History
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); undoProposal(); }} disabled={!canUndoProposal} style={{ background: canUndoProposal ? '#fff' : 'transparent', border: canUndoProposal ? '1px solid #E8E0D4' : '1px solid transparent', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', cursor: canUndoProposal ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4, color: canUndoProposal ? '#1A1410' : '#8B7355', opacity: canUndoProposal ? 1 : 0.6 }}>
                        <Undo2 size={12} /> Prev
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); redoProposal(); }} disabled={!canRedoProposal} style={{ background: canRedoProposal ? '#fff' : 'transparent', border: canRedoProposal ? '1px solid #E8E0D4' : '1px solid transparent', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', cursor: canRedoProposal ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4, color: canRedoProposal ? '#1A1410' : '#8B7355', opacity: canRedoProposal ? 1 : 0.6 }}>
                        Next <Redo2 size={12} />
                      </button>
                    </div>
                    <button 
                      onClick={() => requireAuth("save_proposal", handleSave)} 
                      disabled={saveStatus !== 'idle'} 
                      style={{ 
                        ...S.btnPri, 
                        background: saveStatus === 'saved' ? '#0B7D6E' : 'linear-gradient(135deg,#E87C2E,#F2C94C)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        opacity: saveStatus === 'saving' ? 0.7 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      {saveStatus === 'saving' ? <Loader2 size={13} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 size={13} /> : <Save size={13} />}
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved to Profile' : 'Save Proposal'}
                    </button>
                    <button onClick={copy} style={{ background: 'transparent', border: '1px solid #E8E0D4', borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#8B7355' }}>
                      {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
                </div>
                {selection && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 8, background: '#F0EBE1', borderRadius: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8B7355', marginRight: 4 }}><Sparkles size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />Refine Selection:</span>
                    <button disabled={refining} onClick={() => refineSelection('rephrase')} style={{ ...S.btnGhost, padding: '4px 10px', fontSize: '0.75rem', border: '1px solid #E8E0D4' }}>Rephrase</button>
                    <button disabled={refining} onClick={() => refineSelection('expand')} style={{ ...S.btnGhost, padding: '4px 10px', fontSize: '0.75rem', border: '1px solid #E8E0D4' }}>Expand</button>
                    <button disabled={refining} onClick={() => refineSelection('shorten')} style={{ ...S.btnGhost, padding: '4px 10px', fontSize: '0.75rem', border: '1px solid #E8E0D4' }}>Shorten</button>
                    {refining && <Loader2 size={14} style={{ color: '#E87C2E', animation: 'spin 1s linear infinite', marginLeft: 'auto' }} />}
                  </div>
                )}
                <div style={{ background: '#FDFAF5', borderRadius: 8, border: '1px solid #E8E0D4', overflow: 'hidden' }}>
                  <ReactQuill 
                    ref={quillRef}
                    theme="snow"
                    value={proposalText}
                    onChange={setProposalText}
                    onChangeSelection={handleSelectionQuill}
                    style={{ minHeight: 300, background: '#fff' }}
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'bullet' }, { 'list': 'ordered' }],
                        ['clean']
                      ]
                    }}
                  />
                </div>
                {(() => {
                  const cleanText = new DOMParser().parseFromString(proposalText, 'text/html').body.textContent || "";
                  const limit = PLATFORM_LIMITS[form.platform] || 5000;
                  const isOver = cleanText.length > limit;
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '0 4px' }}>
                      <div style={{ fontSize: '0.72rem', color: isOver ? '#DC2626' : '#8B7355', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isOver && <AlertCircle size={12} />}
                        {cleanText.length} / {limit} characters
                      </div>
                      {isOver && (
                        <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700 }}>
                          Warning: Exceeds {form.platform} limit
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Smart Questions */}
              <div style={S.card}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: '#0B7D6E' }}>Smart Client Questions</h4>
                <p style={{ fontSize: '0.8rem', color: '#8B7355', marginBottom: 16 }}>Ask these to show immediate deep expertise in the problem space:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.smartQuestions.map((q, i) => (
                    <div key={i} style={{ 
                      padding: '12px 16px', 
                      background: '#F0F9F8', 
                      border: '1px solid #0B7D6E', 
                      borderRadius: 8, 
                      fontSize: '0.85rem',
                      color: '#0B7D6E',
                      fontWeight: 500,
                      boxShadow: '0 2px 4px rgba(11,125,110,0.05)'
                    }}>
                      <span style={{ fontWeight: 700, marginRight: 8 }}>Q:</span>
                      {q}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', minHeight: 300 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F0EBE1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <FileText size={20} color="#8B7355" />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>Ready to bid?</h4>
              <p style={{ color: '#8B7355', fontSize: '0.875rem', maxWidth: 300, lineHeight: 1.5 }}>
                Fill out the freelancer details and paste a job description on the left to write a hyper-converting proposal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
