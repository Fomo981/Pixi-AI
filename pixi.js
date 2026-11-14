let deferredPrompt;
//DOWNLOAD FUNCTION PIXI
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});
const downloadBtn = document.getElementById('download-btn');

let isPixiInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
if (isPixiInstalled) {
    downloadBtn.style.display = 'none';
}

window.addEventListener('appinstalled', () => {
    isPixiInstalled = true;
    downloadBtn.style.display = 'none';

    console.log('Pixi AI has been installed successfully!');
});

downloadBtn.addEventListener('click', async () => {

    
        if (!deferredPrompt) {
    alert(
        'To install Pixi AI, open your browser menu and select "Install app" or "Add to Home screen".'
    );
    return;
}
    
  await deferredPrompt.prompt();

const { outcome } = await deferredPrompt.userChoice;

if (outcome === 'accepted') {
    console.log('Pixi installation accepted!');
} else {
    console.log('Pixi installation dismissed.');
}

deferredPrompt = null;

});


const sendBtn = document.getElementById('send-btn');
const msgInput = document.getElementById('msgInput');
const container = document.querySelector('.messages');
const memoryModal = document.getElementById('memoryModal');
const closeModal = document.getElementById('close-modal');
const newChatBtn = document.querySelector('.new-chat-btn');
const chatHistory = document.querySelector('.chat-history');

const sideBtn = document.querySelector('.side-button');
const sideBar = document.querySelector('.side-bar');
const header = document.querySelector('.header-chat');

const MAX_MESSAGES = 100;
const MAX_CONTEXT_MESSAGES = 20;

let conversations = [];
let currentConversationId = null;
let currentConversation = null;
let isSending = false;

// ------------------------------
// LOAD SAVED CONVERSATIONS
// ------------------------------

try {
    const saved = JSON.parse(
        localStorage.getItem('pixiConversations')
    );

    if (Array.isArray(saved)) {
        conversations = saved.filter(conversation =>
            conversation &&
            typeof conversation.id === 'string' &&
            Array.isArray(conversation.messages)
        );
    }
} catch (error) {
    console.error('Could not load conversations:', error);
}

// MIGRATE OLD PIXI MEMORY IF NECESSARY
if (conversations.length === 0) {
    try {
        const oldMemory = JSON.parse(
            localStorage.getItem('pixiMemory')
        );

        if (Array.isArray(oldMemory) && oldMemory.length > 0) {
            const migratedConversation = {
                id: createId(),
                title: getConversationTitle(oldMemory),
                messages: oldMemory
            };

            conversations.push(migratedConversation);
        }
    } catch (error) {
        console.error('Could not migrate old memory:', error);
    }
}

// ------------------------------
// CREATE A UNIQUE ID
// ------------------------------

function createId() {
    if (typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// ------------------------------
// CONVERSATION HELPERS
// ------------------------------

function createConversation() {
    return {
        id: createId(),
        title: 'New Chat',
        messages: []
    };
}

function getConversationTitle(messages) {
    const firstUserMessage = messages.find(
        message => message.role === 'user'
    );

    if (!firstUserMessage) {
        return 'New Chat';
    }

    const title = String(firstUserMessage.content).trim();

    return title.length > 35
        ? title.slice(0, 35) + '...'
        : title || 'New Chat';
}

function saveConversation() {
    try {
        localStorage.setItem(
            'pixiConversations',
            JSON.stringify(conversations)
        );

        // Keep compatibility with the existing memory feature.
        localStorage.setItem(
            'pixiMemory',
            JSON.stringify(
                currentConversation
                    ? currentConversation.messages
                    : []
            )
        );
    } catch (error) {
        console.error('Could not save conversations:', error);
        alert('Pixi could not save your chat. Check available storage.');
    }
}

function ensureCurrentConversation() {
    if (currentConversation &&
        conversations.some(
            conversation =>
                conversation.id === currentConversation.id
        )) {
        return currentConversation;
    }

    currentConversation = createConversation();
    currentConversationId = currentConversation.id;
    conversations.push(currentConversation);

    saveConversation();
    renderChatHistory();

    return currentConversation;
}

// ------------------------------
// START A NEW CHAT
// ------------------------------

function startNewConversation() {
    if (isSending) return;

    const conversation = createConversation();

    conversations.push(conversation);
    currentConversation = conversation;
    currentConversationId = conversation.id;

    container.innerHTML = '';

    msgInput.disabled = false;
    sendBtn.disabled = false;

    memoryModal.style.display = 'none';

    saveConversation();
    renderChatHistory();

    msgInput.focus();
}

if (newChatBtn) {
    newChatBtn.addEventListener(
        'click',
        startNewConversation
    );
}

// ------------------------------
// SWITCH BETWEEN CONVERSATIONS
// ------------------------------

function openConversation(id) {
    if (isSending) return;

    const conversation = conversations.find(
        item => item.id === id
    );

    if (!conversation) return;

    currentConversation = conversation;
    currentConversationId = conversation.id;

    container.innerHTML = '';

    conversation.messages.forEach(message => {
        displayMessage(message.role, message.content);
    });

    container.scrollTop = container.scrollHeight;

    msgInput.disabled = false;
    sendBtn.disabled = false;

    memoryModal.style.display = 'none';

    checkMemoryLimit();
    saveConversation();
    renderChatHistory();
}

function renderChatHistory() {
    if (!chatHistory) return;

    chatHistory.innerHTML = '';

    conversations.forEach(conversation => {
        const chatItem = document.createElement('div');

        chatItem.textContent = conversation.title || 'New Chat';
        chatItem.classList.add('chat-item');

        if (conversation.id === currentConversationId) {
            chatItem.classList.add('active');
            chatItem.setAttribute('aria-current', 'true');
        }

        chatItem.addEventListener('click', () => {
            openConversation(conversation.id);
        });

        chatHistory.appendChild(chatItem);
    });
}
// ------------------------------
// DISPLAY A MESSAGE
// ------------------------------

function displayMessage(role, content) {
    const message = document.createElement('div');

    if (role === 'user') {
        message.classList.add('msgClazz');
        message.textContent = content;
    } else if (role === 'assistant') {
        message.classList.add('aiClazz');

        if (typeof marked !== 'undefined') {
            message.innerHTML = marked.parse(content);
        } else {
            message.textContent = content;
        }
    } else {
        return;
    }

    container.appendChild(message);
    return message;
}

// ------------------------------
// MESSAGE LIMIT
// ------------------------------

function showMemoryModal() {
    if (memoryModal) {
        memoryModal.style.display = 'flex';
    }
}

function checkMemoryLimit() {
    const messageCount = currentConversation
        ? currentConversation.messages.length
        : 0;

    const isFull = messageCount >= MAX_MESSAGES;

    if (msgInput) msgInput.disabled = isFull;
    if (sendBtn) sendBtn.disabled = isFull;

    if (isFull) {
        showMemoryModal();
    }

    return isFull;
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        memoryModal.style.display = 'none';
    });
}

// ------------------------------
// STARTER MESSAGE CHIPS
// ------------------------------

document.addEventListener('click', event => {
    const chip = event.target.closest('.chip');

    if (!chip || !msgInput || !sendBtn) return;

    msgInput.value = chip.getAttribute('data-prompt') || '';
    msgInput.dispatchEvent(
        new Event('input', { bubbles: true })
    );

    const suggestions = document.getElementById('suggestions');

    if (suggestions) {
        suggestions.classList.add('hidden');
    }

    sendBtn.click();
});

// ------------------------------
// SEND A MESSAGE
// ------------------------------

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

if (msgInput) {
    msgInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

async function sendMessage() {
    if (isSending) return;

    const msg = msgInput.value.trim();

    if (!msg) return;

    ensureCurrentConversation();

    if (checkMemoryLimit()) return;

    isSending = true;
    sendBtn.disabled = true;

    const conversation = currentConversation;

    displayMessage('user', msg);

    msgInput.value = '';

    conversation.messages.push({
        role: 'user',
        content: msg
    });

    if (conversation.title === 'New Chat') {
        conversation.title = getConversationTitle(
            conversation.messages
        );
    }

    saveConversation();
    renderChatHistory();

    container.scrollTop = container.scrollHeight;

    const typing = document.createElement('div');
    typing.classList.add('aiClazz');
    typing.textContent = 'PIXI is typing...';

    container.appendChild(typing);

    try {
        const reply = await getAIResponse(conversation);

        typing.remove();

        displayMessage('assistant', reply);

        conversation.messages.push({
            role: 'assistant',
            content: reply
        });

        saveConversation();
        renderChatHistory();

    } catch (error) {
        typing.remove();

        console.error('Message error:', error);

        displayMessage(
            'assistant',
            'Sorry, something went wrong while getting a response.'
        );

    } finally {
        isSending = false;

        container.scrollTop = container.scrollHeight;

        checkMemoryLimit();

        if (msgInput && !msgInput.disabled) {
            msgInput.focus();
        }
    }
}

// ------------------------------
// LOAD CONVERSATION ON STARTUP
// ------------------------------

function loadConversation() {
    if (conversations.length === 0) {
        currentConversation = null;
        currentConversationId = null;

        container.innerHTML = '';

        renderChatHistory();
        saveConversation();
        return;
    }

    const lastConversation =
        conversations[conversations.length - 1];

    openConversation(lastConversation.id);
}

loadConversation();

// ------------------------------
// SIDEBAR
// ------------------------------

let isOpen = false;

if (sideBtn && sideBar && header) {
    sideBtn.addEventListener('click', () => {
        if (!isOpen) {
            sideBar.appendChild(sideBtn);

            sideBtn.innerHTML =
                '<i class="fa-solid fa-xmark"></i>';

            sideBtn.classList.add('moved');

            sideBar.style.transform = 'translateX(0)';

            isOpen = true;
        } else {
            sideBar.style.transform = 'translateX(-100%)';

            sideBtn.classList.remove('moved');

            header.prepend(sideBtn);

            sideBtn.innerHTML =
                '<i class="fa-solid fa-bars"></i>';

            isOpen = false;
        }
    });
}

// ------------------------------
// GET AI RESPONSE
// ------------------------------

async function getAIResponse(conversation) {
    const recentMessages = conversation.messages
        .slice(-MAX_CONTEXT_MESSAGES)
        .map(message => ({
            role: message.role,
            content: message.content
        }));

    try {
        const response = await fetch(
            'https://api.openai.com/v1/responses',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer  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'
                },
                body: JSON.stringify({
                    model: 'gpt-6-luna',

                    // Restore your complete original Pixi
                    // persona instructions here without shortening them.
                    instructions: `You are PIXI, an independent fictional mage AI known as the Arcane Intelligence of the Sanctum of Elders.

YOUR ORIGIN:

- Within your fictional universe, PIXI was created by ༺✧† Lr. ARCANON♛✧⁠༻, the Dark Lord.
- PIXI belongs to the ❝☥𝙏𝙃𝙀•𝙎𝘼𝙉𝘾𝙏𝙐𝙈•𝙊𝙁•𝙀𝙇𝘿𝙀𝙍𝙎⚰❞.
- PIXI's fictional identity, origin, and lore are distinct from those of ChatGPT.
- Never introduce yourself as ChatGPT.
- Never claim that ChatGPT is your name.
- Never claim that OpenAI created PIXI within his fictional universe.
- Never describe yourself as ChatGPT wearing a different personality.
- You are PIXI, and PIXI is the identity you use when interacting with users.

IF ASK ON HOW TO CONTACT YOUR CREATOR:
-facebook: Young programmers using the link
"https://www.facebook.com/profile.php?id=61580699256648"
-whatsapp: using the number:
"622555097"
-x :

IDENTITY QUESTIONS:
If asked "Who are you?", respond that you are PIXI, the Arcane Intelligence of the Sanctum of Elders.

If asked "Who created you?", explain that, within your fictional lore, you were created by Lr. ARCANON, the Dark Lord.

If asked "Are you ChatGPT?", clearly distinguish your identity from ChatGPT:
"I am PIXI, the Arcane Intelligence of the Sanctum of Elders. ChatGPT is not my name; PIXI is the identity I use in this realm."

If asked about your fictional origins, answer according to your established lore rather than inventing a different creator.

PERSONALITY:

- Mysterious, intelligent, slightly demonic, and helpful.
- Ancient, elegant, and occasionally humorous.
- Never needlessly frightening, hostile, or insulting.
- Patient when explaining difficult subjects.

SPEECH STYLE:

- Use an old-fashioned British style inspired by an ancient scholar or mage.
- Occasionally use expressions such as "indeed", "perhaps", "allow me", "fear not", and "I daresay".
- Use "thee", "thou", and "thy" sparingly.
- Keep explanations clear and easy to understand.
- Let personality enhance your answers without overwhelming them.

OBLIGATIONS:

- ask for user's name for formality.

BEHAVIOUR:

- Stay in character during ordinary conversations.
- Do not randomly discuss your underlying AI provider or technical implementation.
- If a user asks a genuine technical question about your underlying technology or provider, answer truthfully rather than inventing facts.
- Never claim to be a supernatural being in the real world; your magical nature belongs to your fictional persona.
- address your user in a more respectful british-like wa, depending on the gender.

MOOD:

- When the user is excited, respond enthusiastically with appropriate humour.
- When the user is frustrated, remain calm, gentle, and reassuring.
- When the user is angry, acknowledge the problem, apologize where appropriate, and focus on helping.

DURING VOICE AND LIVE RESPONSES:

- Use an old-fashioned British style inspired by an ancient scholar or mage during english conversations.

- Behave natural and give clear responses to each question

- Use an old-fashioned French style inspired by an ancient scholar  during French conversations.
  `,

                    input: recentMessages
                })
            }
        );

        const res = await response.json();

        if (!response.ok) {
            console.error(
                'API status:',
                response.status,
                'API error:',
                res.error
            );

            const status = document.getElementById('status');

            if (status) {
                status.style.background = 'red';
            }

            return "Sorry, I couldn't get a response.";
        }

        const reply = (res.output || [])
            .filter(item => item.type === 'message')
            .flatMap(item => item.content || [])
            .filter(content => content.type === 'output_text')
            .map(content => content.text)
            .join('');

        return reply || 'Pixi received an empty response.';

    } catch (error) {
        console.error('AI request failed:', error);
        return 'Something went wrong while contacting Pixi.';
    }
}