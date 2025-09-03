const askBtn = document.getElementById("askBtn");
const answersDiv = document.getElementById("answers");
const clearBtn = document.createElement("button");
clearBtn.textContent = "Chatsni tozalash 🗑️";
clearBtn.style.marginTop = "10px";
document.querySelector(".container").appendChild(clearBtn);

askBtn.addEventListener("click", async () => {
    const question = document.getElementById("question").value;
    if (!question) return alert("Savolni yozing!");

    answersDiv.innerHTML += `<div><b>Siz:</b> ${question}</div>`;
    answersDiv.innerHTML += `<p><i>Javob kutilyapti...</i></p>`;

    try {
        const res = await fetch("http://localhost:3100/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: question, userId: "xojiakbar" })
        });

        const data = await res.json();
        answersDiv.innerHTML += `<div class="answer"><b>AI:</b> ${data.answer}</div>`;
    } catch (err) {
        answersDiv.innerHTML += `<p>Xato yuz berdi: ${err}</p>`;
    }
});

clearBtn.addEventListener("click", async () => {
    try {
        const res = await fetch("http://localhost:3100/clear", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: "xojiakbar" })
        });

        const data = await res.json();
        answersDiv.innerHTML = `<div class="answer"><b>AI:</b> ${data.answer}</div>`;
    } catch (err) {
        answersDiv.innerHTML = `<p>Xato yuz berdi: ${err}</p>`;
    }
});
