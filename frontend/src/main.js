const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");
const header = document.querySelector(".header");

const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");
const promptInput = document.querySelector(".prompt__form-input");

let isGeneratingResponse = false;
let chatHistory = [];

const BACKEND_API_URL = "https://gemini-backend-bq2m.onrender.com/chat";


const createChatMessageElement = (htmlContent, ...cssClasses) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", ...cssClasses);
    messageElement.innerHTML = htmlContent;
    return messageElement;
};

const showTypingEffect = (rawText, messageElement, incomingMessageElement) => {
    const plainText = rawText.replace(/<[^>]+>/g, "");
    let index = 0;
    messageElement.textContent = "";

    const typingInterval = setInterval(() => {
        if (index < plainText.length) {
            messageElement.textContent += plainText.charAt(index);
            index++;
        } else {
            clearInterval(typingInterval);

            // tayyor HTMLni qo‘yish
            messageElement.innerHTML = rawText;

            hljs.highlightAll();
            addCopyButtonToCodeBlocks();
            incomingMessageElement.querySelector(".message__icon").classList.remove("hide");
            isGeneratingResponse = false;

            // 🚀 Javob tugagach majburiy eng pastga tushirish
            chatHistoryContainer.scrollTo({
                top: chatHistoryContainer.scrollHeight,
                behavior: "smooth"
            });
        }
    }, 5);
};

const requestApiResponse = async (incomingMessageElement) => {
    const messageTextElement = incomingMessageElement.querySelector(".message__text");
    const currentUserMessage = chatHistory[chatHistory.length - 1].parts[0].text;

    try {
        const response = await fetch(BACKEND_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                history: chatHistory.slice(0, -1),
                message: currentUserMessage
            }),
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || "API so'rovida xatolik");

        const botResponse = responseData.response;

        chatHistory.push({ role: "model", parts: [{ text: botResponse }] });

        showTypingEffect(botResponse, messageTextElement, incomingMessageElement);
        saveChatToLocalStorage();

    } catch (error) {
        console.error("Backend Error:", error);
        isGeneratingResponse = false;
        messageTextElement.innerText = `Xatolik: ${error.message}`;
        messageTextElement.closest(".message").classList.add("message--error");
    } finally {
        incomingMessageElement.querySelector(".message__loading-indicator").remove();
    }
};

const addCopyButtonToCodeBlocks = () => {
    document.querySelectorAll('pre').forEach((block) => {
        if (block.querySelector('.code__copy-btn')) return;
        const codeElement = block.querySelector('code');
        const language = [...codeElement.classList].find(cls => cls.startsWith('language-'))?.replace('language-', '') || 'text';

        const languageLabel = document.createElement('div');
        languageLabel.innerText = language.charAt(0).toUpperCase() + language.slice(1);
        languageLabel.classList.add('code__language-label');
        block.appendChild(languageLabel);

        const copyButton = document.createElement('button');
        copyButton.innerHTML = `<i class='bx bx-copy'></i>`;
        copyButton.classList.add('code__copy-btn');
        block.appendChild(copyButton);

        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                copyButton.innerHTML = `<i class='bx bx-check'></i>`;
                setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy'></i>`, 2000);
            });
        });
    });
};

const displayLoadingAnimation = () => {
    const loadingHtml = `
        <div class="message__content">
            <img class="message__avatar" src="https://placehold.co/40x40/4a90e2/FFFFFF?text=G" alt="Gemini avatar">
            <div class="message__loading-indicator">
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
            </div>
            <p class="message__text"></p>
        </div>
        <span onClick="copyMessageToClipboard(this)" class="message__icon hide">
            <i class='bx bx-copy-alt'></i>
        </span>`;
    const loadingMessageElement = createChatMessageElement(loadingHtml, "message--incoming", "message--loading");
    chatHistoryContainer.appendChild(loadingMessageElement);

    requestApiResponse(loadingMessageElement);
};

const copyMessageToClipboard = (copyButton) => {
    const messageContent = copyButton.parentElement.querySelector(".message__text").innerText;
    navigator.clipboard.writeText(messageContent).then(() => {
        copyButton.innerHTML = `<i class='bx bx-check'></i>`;
        setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy-alt'></i>`, 1000);
    });
};

const handleOutgoingMessage = () => {
    const currentUserMessage = promptInput.value.trim();
    if (!currentUserMessage || isGeneratingResponse) return;

    isGeneratingResponse = true;
    promptInput.value = "";

    chatHistory.push({ role: "user", parts: [{ text: currentUserMessage }] });

    const outgoingMessageHtml = `
    <div class="message__content">
        <img class="message__avatar" src="https://placehold.co/40x40/777/FFF?text=U" alt="User avatar">
        <p class="message__text">${currentUserMessage}</p>
    </div>`;
    const outgoingMessageElement = createChatMessageElement(outgoingMessageHtml, "message--outgoing");
    chatHistoryContainer.appendChild(outgoingMessageElement);

    header.classList.add("hide-header");
    setTimeout(displayLoadingAnimation, 300);
};

const saveChatToLocalStorage = () => {
    localStorage.setItem("gemini-chat-history", JSON.stringify(chatHistory));
};

const loadChatFromLocalStorage = () => {
    const savedHistory = JSON.parse(localStorage.getItem("gemini-chat-history")) || [];
    chatHistory = savedHistory;

    if (!chatHistory.length) return;

    chatHistory.forEach(turn => {
        const messageClass = turn.role === 'user' ? 'message--outgoing' : 'message--incoming';
        const avatarText = turn.role === 'user' ? 'U' : 'G';
        const avatarBg = turn.role === 'user' ? '777' : '4a90e2';
        const parsedText = marked.parse(turn.parts[0].text);

        const messageHtml = `
            <div class="message__content">
                <img class="message__avatar" src="https://placehold.co/40x40/${avatarBg}/FFF?text=${avatarText}" alt="${turn.role} avatar">
                <p class="message__text">${parsedText}</p>
            </div>
            ${turn.role === 'model' ? `<span onClick="copyMessageToClipboard(this)" class="message__icon"><i class='bx bx-copy-alt'></i></span>` : ''}
        `;
        const messageElement = createChatMessageElement(messageHtml, messageClass);
        chatHistoryContainer.appendChild(messageElement);
    });

    hljs.highlightAll();
    addCopyButtonToCodeBlocks();
    header.classList.add("hide-header");

    // faqat eski chatni yuklab bo‘lgandan keyin ham pastga tushirish
    chatHistoryContainer.scrollTo({
        top: chatHistoryContainer.scrollHeight,
        behavior: "smooth"
    });
};

const loadTheme = () => {
    const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
    document.body.classList.toggle("light_mode", isLightTheme);
    themeToggleButton.querySelector("i").className = isLightTheme ? "bx bx-moon" : "bx bx-sun";
};

themeToggleButton.addEventListener('click', () => {
    const isLightTheme = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggleButton.querySelector("i").className = isLightTheme ? "bx bx-moon" : "bx bx-sun";
});

clearChatButton.addEventListener('click', () => {
    if (confirm("Haqiqatan ham barcha suhbat tarixini o'chirmoqchimisiz?")) {
        localStorage.removeItem("gemini-chat-history");
        chatHistoryContainer.innerHTML = "";
        header.classList.remove("hide-header");
        chatHistory = [];
        isGeneratingResponse = false;
    }
});

suggestionItems.forEach(suggestion => {
    suggestion.addEventListener('click', () => {
        promptInput.value = suggestion.querySelector(".suggests__item-text").innerText;
        handleOutgoingMessage();
    });
});

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleOutgoingMessage();
});

loadTheme();
loadChatFromLocalStorage();
