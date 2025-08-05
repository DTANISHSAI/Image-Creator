// DOM Elements
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const generatedImage = document.getElementById('generatedImage');
const resultImage = document.getElementById('resultImage');
const loadingModal = document.getElementById('loadingModal');
const styleOptions = document.querySelectorAll('.style-option');
const navLinks = document.querySelectorAll('.nav-link');

// Animation and Interaction Variables
let isGenerating = false;
let selectedStyle = 'realistic';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    setupEventListeners();
    setupScrollAnimations();
    setupParallaxEffects();
    checkAPIKey();
});

// Check if API key is configured
function checkAPIKey() {
    const activeConfig = CONFIG[CONFIG.ACTIVE_API.toUpperCase()];
    
    if (CONFIG.ACTIVE_API === 'demo') {
        showNotification('🎨 Demo mode active - Using free image search', 'info');
        return;
    }
    
    if (activeConfig.API_KEY === `YOUR_${CONFIG.ACTIVE_API.toUpperCase()}_API_KEY`) {
        showNotification(`⚠️ Please configure your ${CONFIG.ACTIVE_API} API key in config.js`, 'error');
        console.log(`To use real AI image generation, get your API key from:`);
        if (CONFIG.ACTIVE_API === 'stability') {
            console.log('https://platform.stability.ai/');
        } else if (CONFIG.ACTIVE_API === 'huggingface') {
            console.log('https://huggingface.co/settings/tokens');
        }
    }
}

// Initialize animations
function initializeAnimations() {
    // Animate floating shapes with different speeds
    const shapes = document.querySelectorAll('.shape');
    shapes.forEach((shape, index) => {
        shape.style.animationDelay = `${index * -5}s`;
        shape.style.animationDuration = `${20 + index * 5}s`;
    });

    // Add entrance animations to elements
    const animatedElements = document.querySelectorAll('.hero-content, .generator-container, .gallery-item');
    animatedElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.8s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 200);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Generate button click
    generateBtn.addEventListener('click', handleGenerateClick);
    
    // Style option selection
    styleOptions.forEach(option => {
        option.addEventListener('click', handleStyleSelection);
    });
    
    // Navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavClick);
    });
    
    // Input animations
    promptInput.addEventListener('focus', handleInputFocus);
    promptInput.addEventListener('blur', handleInputBlur);
    promptInput.addEventListener('input', handleInputChange);
    
    // Download and share buttons
    document.querySelector('.download-btn')?.addEventListener('click', handleDownload);
    document.querySelector('.share-btn')?.addEventListener('click', handleShare);
    
    // Gallery item clicks
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', handleGalleryItemClick);
    });
}

// Handle generate button click
async function handleGenerateClick() {
    if (isGenerating) return;
    
    const prompt = promptInput.value.trim();
    if (!prompt) {
        showNotification('Please enter a description for your image', 'error');
        return;
    }
    
    const activeConfig = CONFIG[CONFIG.ACTIVE_API.toUpperCase()];
    
    if (CONFIG.ACTIVE_API === 'demo') {
        // Demo mode doesn't need API key validation
        return;
    }
    
    if (activeConfig.API_KEY === `YOUR_${CONFIG.ACTIVE_API.toUpperCase()}_API_KEY`) {
        showNotification(`Please configure your ${CONFIG.ACTIVE_API} API key first`, 'error');
        return;
    }
    
    isGenerating = true;
    generateBtn.classList.add('loading');
    showLoadingModal();
    
    try {
        // Generate real AI image
        const imageUrl = await generateAIImage(prompt, selectedStyle);
        
        // Display the generated image
        displayGeneratedImage(imageUrl, prompt, selectedStyle);
        
        // Show generation info
        if (CONFIG.ACTIVE_API === 'demo') {
            showNotification('📸 Found relevant image from Unsplash', 'info');
        } else {
            showNotification('🎨 AI-generated image created', 'success');
        }
        
        // Show success animation
        showNotification('🎨 Image generated successfully!', 'success');
        
    } catch (error) {
        console.error('Image generation error:', error);
        showNotification(`Failed to generate image: ${error.message}`, 'error');
    } finally {
        isGenerating = false;
        generateBtn.classList.remove('loading');
        hideLoadingModal();
    }
}

// Generate AI image using configured API
async function generateAIImage(prompt, style) {
    const styleConfig = STYLE_CONFIGS[style];
    const enhancedPrompt = styleConfig.prefix + prompt + styleConfig.suffix;
    
    if (CONFIG.ACTIVE_API === 'stability') {
        return await generateWithStabilityAI(enhancedPrompt, style);
    } else if (CONFIG.ACTIVE_API === 'huggingface') {
        return await generateWithHuggingFace(enhancedPrompt);
    } else if (CONFIG.ACTIVE_API === 'demo') {
        return await generateWithDemo(enhancedPrompt);
    } else {
        throw new Error('Invalid API configuration');
    }
}

// Generate with Stability AI
async function generateWithStabilityAI(prompt, style) {
    const requestBody = {
        text_prompts: [
            {
                text: prompt,
                weight: 1
            }
        ],
        cfg_scale: 7,
        height: CONFIG.SETTINGS.DEFAULT_HEIGHT,
        width: CONFIG.SETTINGS.DEFAULT_WIDTH,
        samples: 1,
        steps: 30,
        style_preset: style === 'realistic' ? 'photographic' : 
                     style === 'artistic' ? 'cinematic' : 
                     style === 'cartoon' ? 'anime' : 'digital-art'
    };

    try {
        const response = await fetch(CONFIG.STABILITY.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.STABILITY.API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.artifacts && result.artifacts.length > 0) {
            // Convert base64 to blob URL
            const base64Image = result.artifacts[0].base64;
            const byteCharacters = atob(base64Image);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            return URL.createObjectURL(blob);
        } else {
            throw new Error('No image generated');
        }
        
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection.');
        }
        throw error;
    }
}

// Generate with Hugging Face
async function generateWithHuggingFace(prompt) {
    try {
        const response = await fetch(CONFIG.HUGGINGFACE.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.HUGGINGFACE.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            
            // If we get a permission error, try the demo mode as fallback
            if (response.status === 403 || response.status === 401) {
                console.log('API permission error, falling back to demo mode');
                showNotification('🔄 Using image search as fallback', 'info');
                return await generateWithDemo(prompt);
            }
            
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Hugging Face returns the image directly as a blob
        const blob = await response.blob();
        return URL.createObjectURL(blob);
        
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection.');
        }
        throw error;
    }
}

// Generate with Demo (Free images from Unsplash)
async function generateWithDemo(prompt) {
    try {
        // Enhanced keyword extraction with better mapping
        const styleKeywords = {
            realistic: ['photography', 'realistic', 'detailed', 'professional'],
            artistic: ['art', 'painting', 'artistic', 'creative', 'digital art'],
            cartoon: ['cartoon', 'animated', 'illustration', 'cute', 'drawing'],
            abstract: ['abstract', 'modern', 'art', 'geometric', 'contemporary']
        };
        
        // Enhanced prompt processing
        let processedPrompt = prompt.toLowerCase();
        
        // Remove AI-specific terms that don't help with image search
        const aiTerms = /highly detailed|photorealistic|professional photography|sharp focus|high resolution|8k quality|masterpiece|artistic|creative|painterly style|vibrant colors|artistic composition|trending on artstation|cartoon style|animated|cute|clean lines|bright colors|cartoon illustration|disney style|abstract art|modern|contemporary|geometric shapes|artistic expression|abstract composition|modern art/gi;
        processedPrompt = processedPrompt.replace(aiTerms, '');
        
        // Extract meaningful keywords
        let keywords = processedPrompt
            .replace(/[^\w\s]/g, ' ')
            .split(' ')
            .filter(word => word.length > 2 && !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must'].includes(word))
            .slice(0, 5);
        
        // Add style-specific keywords
        const currentStyle = selectedStyle;
        if (styleKeywords[currentStyle]) {
            keywords = [...keywords, ...styleKeywords[currentStyle]];
        }
        
        // Create multiple search queries for better results
        const searchQueries = [
            keywords.join(' '),
            keywords.slice(0, 3).join(' '), // Shorter query
            keywords.slice(0, 2).join(' ') + ' ' + styleKeywords[currentStyle][0] // Style-focused
        ];
        
        console.log('Trying search queries:', searchQueries);
        
        // Try multiple search queries
        for (let query of searchQueries) {
            if (query.trim().length < 2) continue;
            
            try {
                const response = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&count=10`, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Client-ID 896d4f52c589547b2134bd75ed48742db637fa51810b49b607e37e46ab2c0043'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        // Pick the best image based on relevance
                        const bestImage = data.find(img => 
                            img.description && 
                            img.description.toLowerCase().includes(keywords[0]) ||
                            img.alt_description && 
                            img.alt_description.toLowerCase().includes(keywords[0])
                        ) || data[0];
                        
                        return bestImage.urls.regular;
                    }
                }
            } catch (e) {
                console.log('Search query failed:', query, e);
                continue;
            }
        }
        
        // Final fallback with broader search
        const fallbackQueries = ['nature', 'landscape', 'art', 'photography'];
        for (let fallbackQuery of fallbackQueries) {
            try {
                const fallbackResponse = await fetch(`https://api.unsplash.com/photos/random?query=${fallbackQuery}&orientation=landscape`, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Client-ID 896d4f52c589547b2134bd75ed48742db637fa51810b49b607e37e46ab2c0043'
                    }
                });
                const fallbackData = await fallbackResponse.json();
                return fallbackData.urls.regular;
            } catch (e) {
                continue;
            }
        }
        
        throw new Error('No suitable images found');
        
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection.');
        }
        throw error;
    }
}

// Display generated image with animations
function displayGeneratedImage(imageUrl, prompt, style) {
    const placeholder = document.querySelector('.placeholder-image');
    const generatedImageDiv = document.getElementById('generatedImage');
    
    // Hide placeholder with animation
    placeholder.style.opacity = '0';
    placeholder.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        placeholder.style.display = 'none';
        generatedImageDiv.style.display = 'block';
        
        // Set image source
        resultImage.src = imageUrl;
        resultImage.alt = `Generated image: ${prompt}`;
        
        // Show image with animation
        resultImage.style.opacity = '0';
        resultImage.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            resultImage.style.transition = 'all 0.5s ease-out';
            resultImage.style.opacity = '1';
            resultImage.style.transform = 'scale(1)';
        }, 100);
        
        // Animate action buttons
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach((btn, index) => {
            setTimeout(() => {
                btn.style.opacity = '0';
                btn.style.transform = 'translateY(20px)';
                btn.style.transition = 'all 0.3s ease-out';
                
                setTimeout(() => {
                    btn.style.opacity = '1';
                    btn.style.transform = 'translateY(0)';
                }, 50);
            }, index * 100);
        });
        
    }, 300);
}

// Handle style selection
function handleStyleSelection(event) {
    const clickedOption = event.currentTarget;
    const style = clickedOption.dataset.style;
    
    // Remove active class from all options
    styleOptions.forEach(option => {
        option.classList.remove('active');
        option.style.transform = 'scale(1)';
    });
    
    // Add active class to clicked option
    clickedOption.classList.add('active');
    clickedOption.style.transform = 'scale(1.05)';
    
    // Reset transform after animation
    setTimeout(() => {
        clickedOption.style.transform = 'scale(1)';
    }, 200);
    
    selectedStyle = style;
    
    // Add visual feedback
    showNotification(`Style changed to: ${style}`, 'info');
}

// Handle navigation clicks
function handleNavClick(event) {
    event.preventDefault();
    
    // Remove active class from all links
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to clicked link
    event.currentTarget.classList.add('active');
    
    // Smooth scroll to section
    const targetId = event.currentTarget.getAttribute('href').substring(1);
    const targetSection = document.getElementById(targetId);
    
    if (targetSection) {
        targetSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Handle input focus
function handleInputFocus(event) {
    const wrapper = event.target.parentElement;
    wrapper.style.transform = 'scale(1.02)';
    wrapper.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.3)';
}

// Handle input blur
function handleInputBlur(event) {
    const wrapper = event.target.parentElement;
    wrapper.style.transform = 'scale(1)';
    wrapper.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
}

// Handle input change
function handleInputChange(event) {
    const text = event.target.value;
    const generateBtn = document.getElementById('generateBtn');
    
    if (text.trim().length > 0) {
        generateBtn.style.opacity = '1';
        generateBtn.style.transform = 'scale(1)';
    } else {
        generateBtn.style.opacity = '0.7';
        generateBtn.style.transform = 'scale(0.95)';
    }
}

// Show loading modal
function showLoadingModal() {
    loadingModal.style.display = 'flex';
    loadingModal.style.opacity = '0';
    
    setTimeout(() => {
        loadingModal.style.transition = 'opacity 0.3s ease-out';
        loadingModal.style.opacity = '1';
    }, 10);
}

// Hide loading modal
function hideLoadingModal() {
    loadingModal.style.opacity = '0';
    
    setTimeout(() => {
        loadingModal.style.display = 'none';
    }, 300);
}

// Handle download
function handleDownload() {
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = 'generated-image.jpg';
    link.click();
    
    showNotification('Image downloaded successfully!', 'success');
}

// Handle share
function handleShare() {
    if (navigator.share) {
        navigator.share({
            title: 'AI Generated Image',
            text: 'Check out this amazing AI-generated image!',
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        showNotification('Link copied to clipboard!', 'success');
    }
}

// Handle gallery item click
function handleGalleryItemClick(event) {
    const item = event.currentTarget;
    const img = item.querySelector('img');
    const overlay = item.querySelector('.gallery-overlay');
    
    // Create modal for full-size view
    const modal = document.createElement('div');
    modal.className = 'gallery-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <img src="${img.src}" alt="${img.alt}">
                <button class="modal-close">&times;</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate modal in
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
    
    // Close modal on click
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-close')) {
            modal.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        }
    });
}

// Setup scroll animations
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for scroll animations
    const scrollElements = document.querySelectorAll('.gallery-item, .footer-section');
    scrollElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s ease-out';
        observer.observe(element);
    });
}

// Setup parallax effects
function setupParallaxEffects() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const shapes = document.querySelectorAll('.shape');
        
        shapes.forEach((shape, index) => {
            const speed = 0.5 + (index * 0.1);
            shape.style.transform = `translateY(${scrolled * speed}px) rotate(${scrolled * 0.1}deg)`;
        });
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        document.body.removeChild(notification);
    });
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#4ecdc4' : '#45b7d1'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease-out;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    });
}

// Add gallery modal styles
const modalStyles = `
    .gallery-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease-out;
    }
    
    .modal-overlay {
        position: relative;
        max-width: 90%;
        max-height: 90%;
    }
    
    .modal-content {
        position: relative;
    }
    
    .modal-content img {
        max-width: 100%;
        max-height: 100%;
        border-radius: 15px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    
    .modal-close {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
    }
    
    .modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
    }
`;

// Inject modal styles
const styleSheet = document.createElement('style');
styleSheet.textContent = modalStyles;
document.head.appendChild(styleSheet);

// Add keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + Enter to generate image
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (!isGenerating) {
            handleGenerateClick();
        }
    }
    
    // Escape to close modals
    if (event.key === 'Escape') {
        const modal = document.querySelector('.gallery-modal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }, 300);
        }
        
        hideLoadingModal();
    }
});

// Add mouse trail effect
let mouseTrail = [];
const maxTrailLength = 20;

document.addEventListener('mousemove', (event) => {
    mouseTrail.push({
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
    });
    
    // Keep only recent positions
    if (mouseTrail.length > maxTrailLength) {
        mouseTrail.shift();
    }
    
    // Create trail effect
    if (mouseTrail.length > 5) {
        createTrailEffect(event.clientX, event.clientY);
    }
});

function createTrailEffect(x, y) {
    const trail = document.createElement('div');
    trail.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 4px;
        height: 4px;
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.6;
        transform: translate(-50%, -50%);
    `;
    
    document.body.appendChild(trail);
    
    // Animate and remove
    setTimeout(() => {
        trail.style.opacity = '0';
        trail.style.transform = 'translate(-50%, -50%) scale(2)';
        setTimeout(() => {
            if (document.body.contains(trail)) {
                document.body.removeChild(trail);
            }
        }, 300);
    }, 100);
}

// Performance optimization: Throttle mouse events
let mouseTimeout;
document.addEventListener('mousemove', () => {
    if (mouseTimeout) return;
    
    mouseTimeout = setTimeout(() => {
        mouseTimeout = null;
    }, 16); // ~60fps
});

console.log('🚀 AI Image Generator loaded with mind-blowing animations!'); 