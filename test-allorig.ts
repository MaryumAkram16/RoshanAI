const res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://serpapi.com/search.json?engine=google&q=test&api_key=INVALID_KEY"));
console.log(res.status);
