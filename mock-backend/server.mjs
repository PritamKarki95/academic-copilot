// Tiny stand-in backend for testing Live mode without the real FastAPI server.
// Run: npm run mock   (MODE=separate | bundled | fail-agent)
// The response shapes here are the contract described in README.md.
import http from "node:http";
const MODE = process.env.MODE || "bundled"; // separate | bundled | fail-agent
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" };
const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const quiz = { questions: [1,2,3,4,5].map(i => ({ question: `Live Q${i}: 2+${i}?`, choices: [`${i+1}`, `${i+2}`, `${i+3}`, `${i+4}`], answer: "B", rationale: `2+${i} = ${i+2}` })) };
const guide = { title: "Live Guide", course: "MATH 101", focus_event: "Midterm", summary: "Live summary from mock backend.", sections: [{ title: "Addition", bullets: ["Point a", "Point b"] }], key_terms: [{ term: "Sum", definition: "Result of adding" }] };
http.createServer((req, res) => {
  let body = []; req.on("data", c => body.push(c)); req.on("end", () => {
    const buf = Buffer.concat(body);
    console.log(req.method, req.url, buf.length, "bytes", req.url !== "/upload" ? buf.toString().slice(0, 200) : buf.toString("latin1").match(/name="files"; filename="[^"]+"/g));
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    const send = (code, obj) => { res.writeHead(code, { ...cors, "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
    setTimeout(() => {
      if (req.url === "/upload") return send(200, { session_id: "abc123", events: [
        { course_name: "MATH 101", title: "Midterm", event_type: "exam", due_date: d(5), weight: "30%" },
        { course_name: "MATH 101", name: "Homework 2", date: d(2) },
      ]});
      if (req.url === "/agent/run") {
        if (MODE === "fail-agent") return send(500, { detail: "LLM provider timeout" });
        return send(200, MODE === "bundled" ? { study_guide: guide, quiz } : { study_guide: guide });
      }
      if (req.url === "/quizzes/generate") return send(200, { quiz });
      send(404, { detail: "not found" });
    }, 1500);
  });
}).listen(8000, () => console.log("mock on 8000", MODE));
