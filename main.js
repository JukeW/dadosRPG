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

const diceAnimationGif = 'assets/dice-roll.gif';

// Pega os elementos do DOM para o modal
const modalOverlay = document.getElementById('modal-overlay');
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
    const gifContainer = document.getElementById(`gif-container-${player}`);
    const numberContainer = document.getElementById(`number-container-${player}`);
    const timers = playerTimers[player];

    Object.values(timers).forEach(clearTimeout);

    const startNewAnimation = () => {
        timers.startAnimation = setTimeout(() => {
            const result = Math.floor(Math.random() * sides) + 1;
            numberContainer.innerHTML = '';
            
            // APLICA OS FILTROS SALVOS AQUI!
            const filters = playerFilters[player];
            gifContainer.style.filter = `hue-rotate(${filters.hue}deg) saturate(${filters.saturation}%) brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;

            gifContainer.style.backgroundImage = `url('${diceAnimationGif}?v=${Date.now()}')`;
            gifContainer.classList.add('visible');

            timers.showNumber = setTimeout(() => {
                numberContainer.innerText = result;
                numberContainer.classList.add('visible');
            }, 1290);

            timers.fadeOut = setTimeout(() => {
                gifContainer.classList.remove('visible');
                numberContainer.classList.remove('visible');
            }, 8000);

            timers.cleanup = setTimeout(() => {
                gifContainer.style.backgroundImage = 'none';
                numberContainer.innerText = '';
                gifContainer.style.filter = 'none'; // Limpa o filtro
            }, 8500);

        }, 100);
    };

    if (gifContainer.classList.contains('visible')) {
        gifContainer.classList.remove('visible');
        numberContainer.classList.remove('visible');
        timers.waitForFadeOut = setTimeout(startNewAnimation, 500);
    } else {
        startNewAnimation();
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