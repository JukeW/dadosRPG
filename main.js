// --- ESTADO INICIAL E VARIÁVEIS GLOBAIS ---

// Guarda os filtros salvos para cada jogador
let playerFilters = {
    player1: { hue: 0, saturation: 100, brightness: 100, contrast: 100 },
    player2: { hue: 0, saturation: 100, brightness: 100, contrast: 100 }
};

// Guarda os timers de animação para cada jogador
let playerTimers = {
    player1: {},
    player2: {}
};

// Guarda qual jogador está editando no modal
let activePlayerForModal = null;
let activePlayerForHistoryModal = null;
let isInitialLoad = true;

const diceAnimationGif = 'assets/dice-roll-merge.gif';
const diceAnimationGif2 = 'assets/dice-roll.gif';

const totalAnimationDuration = 11450; // Duração total do GIF
const numberAppearanceTime = 1250;   // Momento exato em que o número deve aparecer
const numberVisibleDuration = 8500; // Quanto tempo o número fica visível (8 segundos)

const imagesToPreload = [diceAnimationGif]; // <- Apenas um GIF para pré-carregar
function preloadImages(urls) {
    urls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}
preloadImages(imagesToPreload);

// Pega os elementos do DOM para o modal
const modalOverlay = document.getElementById('modal-overlay');
const historyModalOverlay = document.getElementById('history-modal-overlay');
const historyLogList = document.getElementById('history-log-list');
const modalPreviewGif = document.getElementById('modal-preview-gif');
const hueSlider = document.getElementById('hue-slider');
const saturationSlider = document.getElementById('saturation-slider');
const brightnessSlider = document.getElementById('brightness-slider');
const contrastSlider = document.getElementById('contrast-slider');
const hueValue = document.getElementById('hue-value');
const saturationValue = document.getElementById('saturation-value');
const brightnessValue = document.getElementById('brightness-value');
const contrastValue = document.getElementById('contrast-value');


// --- LÓGICA DO ROLADOR DE DADOS ---

function rollDice(sides, player) {
    const result = Math.floor(Math.random() * sides) + 1;
    const timestamp = Date.now();

    const rollData = {
        player: player,
        result: result,
        filters: playerFilters[player],
        timestamp: timestamp
    };

    // Atualiza a última rolagem (para a animação em tempo real)
    database.ref('lastRoll').set(rollData);

    // ADICIONADO: Salva a rolagem na lista de histórico do jogador
    const historyEntry = {
        result: result,
        timestamp: timestamp
    };
    database.ref(`rollHistory/${player}`).push(historyEntry);
}


const lastRollRef = database.ref('lastRoll');
lastRollRef.on('value', (snapshot) => {
    // Se for a primeira vez que este código roda desde que a página carregou,
    // nós ativamos a trava e paramos a execução aqui.
    if (isInitialLoad) {
        isInitialLoad = false; // Desativa a trava
        return; // Impede que o resto da função seja executado
    }

    const rollData = snapshot.val();
    if (rollData) {
        // Nas vezes seguintes (cliques reais), esta parte será executada normalmente
        playAnimation(rollData);
    }
});

function playAnimation(data) {
    const { player, result, filters } = data;

    const gifContainer = document.getElementById(`gif-container-${player}`);
    const numberContainer = document.getElementById(`number-container-${player}`);
    const timers = playerTimers[player];

    // Interrompe qualquer animação anterior
    Object.values(timers).forEach(clearTimeout);
    
    // Limpa o estado visual anterior
    numberContainer.classList.remove('visible');
    numberContainer.innerText = '';
    
    // PASSO 1: Mostra o GIF completo e aplica os filtros
    gifContainer.style.filter = `hue-rotate(${filters.hue}deg) saturate(${filters.saturation}%) brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
    gifContainer.style.backgroundImage = `url('${diceAnimationGif2}?v=${Date.now()}')`;
    gifContainer.classList.add('visible');

    // PASSO 2: Mostra o número com fade-in no momento certo
    timers.showNumber = setTimeout(() => {
        numberContainer.innerText = result;
        numberContainer.classList.add('visible');
    }, numberAppearanceTime);

    // PASSO 3 (NOVO E CORRIGIDO): Agenda o fade-out do número após 8 segundos
    timers.hideNumber = setTimeout(() => {
        numberContainer.classList.remove('visible'); // Isso vai acionar a transição de fade-out do CSS
    }, numberAppearanceTime + numberVisibleDuration); // Aparece em 1.25s + Fica visível por 8s = Some em 9.25s

    // PASSO 4: Limpeza final, quando o GIF inteiro terminar
    timers.cleanup = setTimeout(() => {
        gifContainer.classList.remove('visible');
        gifContainer.style.backgroundImage = 'none';
        numberContainer.innerText = ''; // Garante que o número seja limpo
        gifContainer.style.filter = 'none';
    }, totalAnimationDuration);
}

function openHistoryModal(player) {
    activePlayerForHistoryModal = player;

    historyLogList.innerHTML = '<p>Carregando histórico...</p>';
    historyModalOverlay.classList.remove('hidden');

    const historyRef = database.ref(`rollHistory/${player}`);
    
    // .once() lê os dados apenas uma vez
    historyRef.once('value', (snapshot) => {
        historyLogList.innerHTML = ''; // Limpa a mensagem de "Carregando"
        
        if (!snapshot.exists()) {
            historyLogList.innerHTML = '<p>Nenhum histórico encontrado para este jogador.</p>';
            return;
        }

        const historyData = snapshot.val();
        
        // Converte os dados em um array e inverte para mostrar o mais novo primeiro
        const entries = Object.values(historyData).reverse();

        entries.forEach(entry => {
            // Formata a data e hora
            const date = new Date(entry.timestamp);
            const formattedDate = date.toLocaleDateString('pt-BR'); // DD/MM/YYYY
            const formattedTime = date.toLocaleTimeString('pt-BR'); // HH:MM:SS
            
            // Cria o elemento de log
            const logElement = document.createElement('div');
            logElement.className = 'log-entry';
            logElement.textContent = `${formattedDate} ${formattedTime} --- Resultado: ${entry.result}`;
            
            historyLogList.appendChild(logElement);
        });
    });
}

function closeHistoryModal() {
    historyModalOverlay.classList.add('hidden');
    activePlayerForHistoryModal = null;
}

function confirmClearHistory() {
    if (!activePlayerForHistoryModal) return;

    const player = activePlayerForHistoryModal;
    
    // Mostra a caixa de diálogo nativa do navegador
    const userConfirmed = confirm('Você tem certeza que deseja apagar todo o histórico deste jogador? Esta ação não pode ser desfeita.');

    // Se o usuário clicou em "OK" (true)
    if (userConfirmed) {
        // Pega a referência do histórico do jogador no Firebase
        const historyRef = database.ref(`rollHistory/${player}`);
        
        // Remove todos os dados daquela referência
        historyRef.remove()
            .then(() => {
                // Se a remoção for bem-sucedida, atualiza a tela
                historyLogList.innerHTML = '<p>Histórico limpo com sucesso.</p>';
                console.log(`Histórico para ${player} foi limpo.`);
            })
            .catch((error) => {
                // Se houver um erro, informa o usuário
                historyLogList.innerHTML = '<p>Ocorreu um erro ao limpar o histórico.</p>';
                console.error("Erro ao limpar histórico: ", error);
            });
    }
}


// --- LÓGICA DO MODAL ---

function openModal(player) {
    activePlayerForModal = player;
    
    // Carrega os filtros salvos do jogador nos sliders
    const currentFilters = playerFilters[player];
    hueSlider.value = currentFilters.hue;
    saturationSlider.value = currentFilters.saturation;
    brightnessSlider.value = currentFilters.brightness;
    contrastSlider.value = currentFilters.contrast;
    
    updatePreview(); // Atualiza a preview e os valores de texto
    
    modalOverlay.classList.remove('hidden');
    // Recarrega o gif do preview para garantir que ele anime
    modalPreviewGif.src = `${diceAnimationGif}?v=${Date.now()}`;
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    activePlayerForModal = null;
}

function updatePreview() {
    // Pega os valores atuais dos sliders
    const hue = hueSlider.value;
    const saturation = saturationSlider.value;
    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;

    // Aplica o filtro na imagem de preview em tempo real
    modalPreviewGif.style.filter = `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`;

    // Atualiza os textos ao lado dos sliders
    hueValue.textContent = `${hue}°`;
    saturationValue.textContent = `${saturation}%`;
    brightnessValue.textContent = `${brightness}%`;
    contrastValue.textContent = `${contrast}%`;
}

function resetFilters() {
    // Define os sliders para os valores padrão
    hueSlider.value = 0;
    saturationSlider.value = 100;
    brightnessSlider.value = 100;
    contrastSlider.value = 100;
    updatePreview(); // Atualiza a preview para refletir a mudança
}

function saveFilters() {
    if (activePlayerForModal) {
        // Salva os valores dos sliders no objeto de filtros do jogador ativo
        playerFilters[activePlayerForModal] = {
            hue: hueSlider.value,
            saturation: saturationSlider.value,
            brightness: brightnessSlider.value,
            contrast: contrastSlider.value
        };
    }
    closeModal();
}

// Adiciona os listeners para os sliders atualizarem a preview em tempo real
hueSlider.addEventListener('input', updatePreview);
saturationSlider.addEventListener('input', updatePreview);
brightnessSlider.addEventListener('input', updatePreview);
contrastSlider.addEventListener('input', updatePreview);

modalOverlay.addEventListener('click', function(event) {
    if (event.target === modalOverlay) {
        closeModal();
    }
});

historyModalOverlay.addEventListener('click', function(event) {
    if (event.target === historyModalOverlay) {
        closeHistoryModal();
    }
});
