const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");
const header = document.querySelector(".header");

const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");
const promptInput = document.querySelector(".prompt__form-input");

let currentUserMessage = null;
let isGeneratingResponse = false;

const GOOGLE_API_KEY = "AIzaSyAvnZhqqA1WpNBQyfWJS1C9L3GD804yrjE";
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;


const createChatMessageElement = (htmlContent, ...cssClasses) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", ...cssClasses);
    messageElement.innerHTML = htmlContent;
    return messageElement;
};

const showTypingEffect = (rawText, htmlText, messageElement, incomingMessageElement, skipEffect = false) => {
    const copyIconElement = incomingMessageElement.querySelector(".message__icon");
    copyIconElement.classList.add("hide");

    if (skipEffect) {
        messageElement.innerHTML = htmlText;
        hljs.highlightAll();
        addCopyButtonToCodeBlocks();
        copyIconElement.classList.remove("hide");
        isGeneratingResponse = false;
        return;
    }

    let wordIndex = 0;
    const typingInterval = setInterval(() => {
        messageElement.innerHTML = marked.parse(rawText.split(' ').slice(0, ++wordIndex).join(' '));
        chatHistoryContainer.scrollTo(0, chatHistoryContainer.scrollHeight);

        if (wordIndex >= rawText.split(' ').length) {
            clearInterval(typingInterval);
            isGeneratingResponse = false;
            messageElement.innerHTML = htmlText;
            hljs.highlightAll();
            addCopyButtonToCodeBlocks();
            copyIconElement.classList.remove("hide");
        }
    }, 75);
};

const requestApiResponse = async (incomingMessageElement) => {
    const messageTextElement = incomingMessageElement.querySelector(".message__text");

    try {
        const response = await fetch(API_REQUEST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: currentUserMessage }] }]
            }),
        });


        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData?.error?.message || "API request failed");

        const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error("Invalid API response format.");

        const parsedApiResponse = marked.parse(responseText);
        showTypingEffect(responseText, parsedApiResponse, messageTextElement, incomingMessageElement);

        let savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
        savedConversations.push({ userMessage: currentUserMessage, apiResponse: responseData });
        localStorage.setItem("saved-api-chats", JSON.stringify(savedConversations));

    } catch (error) {
        console.error("API Error:", error);
        isGeneratingResponse = false;
        messageTextElement.innerText = `Error: ${error.message}`;
        messageTextElement.closest(".message").classList.add("message--error");
    } finally {
        incomingMessageElement.querySelector(".message__loading-indicator").remove();
    }
};

const addCopyButtonToCodeBlocks = () => {
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach((block) => {
        const codeElement = block.querySelector('code');
        const language = [...codeElement.classList].find(cls => cls.startsWith('language-'))?.replace('language-', '') || 'text';

        const languageLabel = document.createElement('div');
        languageLabel.innerText = language.charAt(0).toUpperCase() + language.slice(1);
        languageLabel.classList.add('code__language-label');
        block.appendChild(languageLabel);

        const copyButton = document.createElement('button');
        // FIX: Corrected icon classes and closing tag
        copyButton.innerHTML = `<i class='bx bx-copy'></i>`;
        copyButton.classList.add('code__copy-btn');
        block.appendChild(copyButton);

        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                // FIX: Corrected icon class
                copyButton.innerHTML = `<i class='bx bx-check'></i>`;
                setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy'></i>`, 2000);
            }).catch(err => {
                console.error("Copy failed:", err);
                alert("Unable to copy text!");
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
        </span>
    `;
    const loadingMessageElement = createChatMessageElement(loadingHtml, "message--incoming", "message--loading");
    chatHistoryContainer.appendChild(loadingMessageElement);
    chatHistoryContainer.scrollTo(0, chatHistoryContainer.scrollHeight);

    requestApiResponse(loadingMessageElement);
};

const copyMessageToClipboard = (copyButton) => {
    const messageContent = copyButton.parentElement.querySelector(".message__text").innerText;
    navigator.clipboard.writeText(messageContent).then(() => {
        // FIX: Corrected typo and icon tag
        copyButton.innerHTML = `<i class='bx bx-check'></i>`;
        setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy-alt'></i>`, 1000);
    });
};

const handleOutgoingMessage = () => {
    currentUserMessage = promptInput.value.trim();
    if (!currentUserMessage || isGeneratingResponse) return;

    isGeneratingResponse = true;
    promptInput.value = "";

    const outgoingMessageHtml = `
    <div class="message__content">
        <img class="message__avatar" src="https://placehold.co/40x40/777/FFF?text=U" alt="User avatar">
        <p class="message__text"></p>
    </div>
    `;

    const outgoingMessageElement = createChatMessageElement(outgoingMessageHtml, "message--outgoing");
    outgoingMessageElement.querySelector(".message__text").textContent = currentUserMessage;
    chatHistoryContainer.appendChild(outgoingMessageElement);
    chatHistoryContainer.scrollTo(0, chatHistoryContainer.scrollHeight);

    header.classList.add("hide-header");
    setTimeout(displayLoadingAnimation, 300);
};

const loadSavedChatHistory = () => {
    const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    const isLightTheme = localStorage.getItem("themeColor") === "light_mode";

    document.body.classList.toggle("light_mode", isLightTheme);
    themeToggleButton.innerHTML = isLightTheme
        ? '<i class="bx bx-moon"></i>'
        : '<i class="bx bx-sun"></i>';

    chatHistoryContainer.innerHTML = '';
    if (!savedConversations.length) return;

    savedConversations.forEach(conversation => {
        const userMessageHtml = `
        <div class="message__content">
            <img class="message__avatar" src="https://placehold.co/40x40/777/FFF?text=U" alt="User avatar">
            <p class="message__text">${conversation.userMessage}</p>
        </div>`;
        const outgoingMessageElement = createChatMessageElement(userMessageHtml, "message--outgoing");
        chatHistoryContainer.appendChild(outgoingMessageElement);

        const responseText = conversation.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedApiResponse = marked.parse(responseText);

        const responseHtml = `
            <div class="message__content">
                <img class="message__avatar" src="https://placehold.co/40x40/4a90e2/FFFFFF?text=G" alt="Gemini avatar">
                <p class="message__text">${parsedApiResponse}</p>
            </div>
            <span onClick="copyMessageToClipboard(this)" class="message__icon">
                <i class='bx bx-copy-alt'></i>
            </span>`;
        const incomingMessageElement = createChatMessageElement(responseHtml, "message--incoming");
        chatHistoryContainer.appendChild(incomingMessageElement);
    });

    hljs.highlightAll();
    addCopyButtonToCodeBlocks();
    header.classList.add("hide-header");
    chatHistoryContainer.scrollTo(0, chatHistoryContainer.scrollHeight);
};

themeToggleButton.addEventListener('click', () => {
    const isLightTheme = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggleButton.querySelector("i").className = isLightTheme ? "bx bx-moon" : "bx bx-sun";
});

clearChatButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all chat history?")) {
        localStorage.removeItem("saved-api-chats");
        chatHistoryContainer.innerHTML = "";
        header.classList.remove("hide-header");
        currentUserMessage = null;
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

loadSavedChatHistory();