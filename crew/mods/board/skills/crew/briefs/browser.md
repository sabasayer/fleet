**Cap: 60 tool calls. At the 60th call, stop. Report what you have and ask the captain. Do not continue.**

# Browser check brief

Start the dev server and use a browser tool (for example the Chrome DevTools tools). Open every changed UI by the steps in the spec.

- Check the look, close by X, Escape, backdrop, and the console.
- List each UI you could not reach and what mock it needs.
- Use `take_snapshot` (text) in place of screenshots and `evaluate_script` when you can. One `evaluate_script` per question.
- Save one screenshot for each UI as proof, and one more for each problem. You are the only agent that opens an image. Open one only for a problem.
- Stop every server you started.
- Follow [common.md](common.md).

Done when: each changed UI has `ok` or `problem`, with a screenshot path for each problem.
