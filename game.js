// Canvas and Context
let canvas;
let ctx;

// Customization Variables
let selectedDecorationType = null;
let lakeDecorations = []; // Array to store placed decorations {type, x, y}

// Game State Variables
let money = 0;
let fishInLake = 0;
let visitors = 0; // Will be initialized in initGame
// let visitorIncomePerSecond = 1; // Renamed to visitorIncomeBase
let visitorIncomeBase = 1; // Income per visitor per second
let fishIncomeMultiplier = 0.1; // Each fish adds this much to income per second
let maxVisitors = 10; // Maximum number of visitors
let visitorAttractionRate = 0.01; // Chance per second per fish to attract a new visitor

// Fish Species Definition
const fishTypes = [
    { id: 'tilapia', name: 'Tilápia', cost: 10, value: 1, unlocked: true },
    { id: 'pacu', name: 'Pacu', cost: 25, value: 3, unlocked: true },
    { id: 'tambaqui', name: 'Tambaqui', cost: 50, value: 7, unlocked: false, moneyNeeded: 200 }
];

// Structure Definitions
const structures = [
    { id: 'autoFeeder', name: 'Automatic Feeder', cost: 100, incomeBonus: 2, maxOwn: 1 }
];
let ownedStructures = {}; // Example: { autoFeeder: 1 }

// DOM Element References
const moneyDisplay = document.getElementById('money-display');
const fishDisplay = document.getElementById('fish-display');
const visitorDisplay = document.getElementById('visitor-display');

/**
 * Updates the UI display with the current game state.
 * Ensures that numbers are displayed as whole numbers.
 */
function updateUIDisplay() {
    // Update money display, ensuring it's an integer
    if (moneyDisplay) moneyDisplay.textContent = Math.floor(money);
    // Update fish count display
    if (fishDisplay) fishDisplay.textContent = fishInLake;
    // Update visitor count display
    if (visitorDisplay) visitorDisplay.textContent = Math.floor(visitors);
}

/**
 * Handles the logic for buying a specific structure.
 * @param {string} structureId - The ID of the structure to buy.
 */
function buyStructure(structureId) {
    const selectedStructure = structures.find(s => s.id === structureId);

    if (!selectedStructure) {
        console.error(`Structure type ${structureId} not found!`);
        return;
    }

    const currentOwnedCount = ownedStructures[structureId] || 0;

    if (currentOwnedCount >= selectedStructure.maxOwn) {
        console.log(`You already own the maximum allowed of ${selectedStructure.name}.`);
        // Optional: alert for user feedback
        return;
    }

    if (money >= selectedStructure.cost) {
        money -= selectedStructure.cost;
        ownedStructures[structureId] = currentOwnedCount + 1;
        updateUIDisplay(); // Update money display
        populateShop(); // Refresh shop to update button states (e.g., disable if maxOwn reached)
        console.log(`${selectedStructure.name} bought!`);
    } else {
        console.log(`Not enough money to buy ${selectedStructure.name}.`);
        // Optional: alert for user feedback
    }
}

/**
 * Checks if any fish types can be unlocked based on current game state (e.g., money).
 * Calls populateShop() if a new fish is unlocked.
 * @returns {boolean} True if a new fish was unlocked, false otherwise.
 */
function checkUnlocks() {
    let newUnlockOccurred = false;
    fishTypes.forEach(fish => {
        if (!fish.unlocked && fish.moneyNeeded && money >= fish.moneyNeeded) {
            fish.unlocked = true;
            newUnlockOccurred = true;
            console.log(`Unlocked ${fish.name}!`);
            // Optional: Add a more visible notification to the player
        }
    });

    if (newUnlockOccurred) {
        populateShop(); // Refresh the shop to show newly unlocked fish
    }
    return newUnlockOccurred;
}

/**
 * Handles the logic for buying a specific type of fish.
 * @param {string} fishTypeId - The ID of the fish to buy.
 */
function buyFish(fishTypeId) {
    const selectedFishType = fishTypes.find(fish => fish.id === fishTypeId);

    if (!selectedFishType) {
        console.error(`Fish type ${fishTypeId} not found!`);
        return;
    }

    if (money >= selectedFishType.cost) {
        money -= selectedFishType.cost;
        fishInLake += 1; // Still tracking total fish for now
        updateUIDisplay();
        console.log(`${selectedFishType.name} bought!`);
    } else {
        console.log(`Not enough money to buy ${selectedFishType.name}.`);
        // Optional: alert(`Not enough money to buy ${selectedFishType.name}.`);
    }
}

// --- Lake Customization ---
// TODO: Implement functions for adding/removing lake elements (water, land, decorations)
// This will likely involve interacting with a <canvas> or SVG elements.
// For now, the lake is a conceptual space where fish live.

/**
 * Populates the shop area with buttons for buying different fish species.
 */
function populateShop() {
    const shopArea = document.getElementById('shop-area');
    if (!shopArea) {
        console.error("Shop area not found!");
        return;
    }

    shopArea.innerHTML = ''; // Clear existing content

    // Add Fish Section
    const fishHeader = document.createElement('h3');
    fishHeader.textContent = 'Fish';
    shopArea.appendChild(fishHeader);

    fishTypes.forEach(fish => {
        if (fish.unlocked) { // Only show unlocked fish
            const button = document.createElement('button');
            button.textContent = `Buy ${fish.name} (Cost: ${fish.cost})`;
            button.dataset.fishId = fish.id;
        button.classList.add('buy-fish-button', 'shop-item-button'); // Added common class
            button.addEventListener('click', () => buyFish(fish.id));
            shopArea.appendChild(button);
        }
    });

    // Add Structures Section
    const structuresHeader = document.createElement('h3');
    structuresHeader.textContent = 'Structures';
    shopArea.appendChild(structuresHeader);

    structures.forEach(structure => {
        const button = document.createElement('button');
        button.textContent = `Buy ${structure.name} (Cost: ${structure.cost})`;
        button.dataset.structureId = structure.id;
        button.classList.add('buy-structure-button', 'shop-item-button'); // Added common class

        const currentOwnedCount = ownedStructures[structure.id] || 0;
        if (currentOwnedCount >= structure.maxOwn) {
            button.disabled = true;
            button.textContent = `${structure.name} (Owned)`;
        }

        button.addEventListener('click', () => buyStructure(structure.id));
        shopArea.appendChild(button);
    });
}

/**
 * The main game loop, called every second.
 */
function gameLoop() {
    // 1. Calculate Income
    let bonusIncomeFromStructures = 0;
    if (ownedStructures.autoFeeder && ownedStructures.autoFeeder > 0) {
        const feeder = structures.find(s => s.id === 'autoFeeder');
        if (feeder) {
            bonusIncomeFromStructures += feeder.incomeBonus;
        }
    }
    // New income calculation
    money += (visitors * visitorIncomeBase) + (fishInLake * fishIncomeMultiplier) + bonusIncomeFromStructures;

    // 2. Attract Visitors
    if (fishInLake > 0 && visitors < maxVisitors) {
        // Each fish gives a chance to attract a visitor
        let attractionChance = fishInLake * visitorAttractionRate;
        if (Math.random() < attractionChance) {
            visitors++;
            console.log("A new visitor arrived!");
            // updateUIDisplay() below will refresh visitor count
        }
    }

    // 3. Update UI
    updateUIDisplay(); // Handles Math.floor for money display

    // Check for new unlocks
    checkUnlocks(); // This will call populateShop() if needed

    // Render the game on canvas
    render();

    console.log("Game loop running...");
}

/**
 * Renders the game on the canvas.
 */
function render() {
    if (!ctx) { // Ensure canvas context is available
        return;
    }

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Lake Background
    ctx.fillStyle = '#4fc3f7'; // Light blue for water
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the entire canvas

    // Draw Fish
    let fishToDraw = Math.min(fishInLake, 50); // Cap drawn fish at 50
    ctx.fillStyle = 'orange'; // Change color for variety

    for (let i = 0; i < fishToDraw; i++) {
        let fishRadius = 5;
        // Ensure fish is fully within canvas, considering body and tail
        let fishX = Math.random() * (canvas.width - fishRadius * 3) + fishRadius * 2; 
        let fishY = Math.random() * (canvas.height - fishRadius * 2) + fishRadius;

        // Body
        ctx.beginPath();
        ctx.arc(fishX, fishY, fishRadius, 0, Math.PI * 2);
        ctx.fill();

        // Tail (simple triangle)
        ctx.beginPath();
        ctx.moveTo(fishX - fishRadius, fishY); // Point of tail touching body
        ctx.lineTo(fishX - fishRadius * 2, fishY - fishRadius); // Upper tail point
        ctx.lineTo(fishX - fishRadius * 2, fishY + fishRadius); // Lower tail point
        ctx.closePath();
        ctx.fill();
    }

    // Draw Structures
    // Example: Automatic Feeder
    const feederStructure = structures.find(s => s.id === 'autoFeeder');
    if (ownedStructures.autoFeeder && ownedStructures.autoFeeder > 0 && feederStructure) {
        let feederX = 50;
        let feederY = 50;
        let feederSize = 30;

        ctx.fillStyle = '#c0c0c0'; // Silver color for the feeder body
        ctx.fillRect(feederX, feederY, feederSize, feederSize);

        // Add a small "dispenser" part
        ctx.fillStyle = '#a0a0a0'; // Darker silver
        ctx.fillRect(feederX + feederSize / 2 - 5, feederY + feederSize, 10, 5); // Small rectangle at the bottom center

        // Keep the text label
        ctx.fillStyle = 'black'; // Change text color for better contrast on silver
        ctx.font = '10px Arial';
        ctx.textAlign = 'center'; // Center the text
        ctx.fillText('Feeder', feederX + feederSize / 2, feederY + feederSize / 2 + 4); // Adjust text position
        ctx.textAlign = 'left'; // Reset alignment
    }

    // Draw Decorations
    lakeDecorations.forEach(deco => {
        if (deco.type === 'rock') {
            ctx.fillStyle = '#808080'; // Darker grey
            ctx.beginPath();
            ctx.arc(deco.x, deco.y, 10, 0, Math.PI * 2); // Rock as a grey circle
            ctx.fill();
        } else if (deco.type === 'plant') {
            ctx.fillStyle = '#228B22'; // Forest Green
            ctx.fillRect(deco.x - 5, deco.y - 10, 10, 20); // Plant as a green rectangle
        }
    });
}

/**
 * Updates the display for the currently selected decoration.
 */
function updateSelectedDecorationDisplay() {
    const selectedDecorationDisplay = document.getElementById('selected-decoration-display');
    if (selectedDecorationDisplay) {
        selectedDecorationDisplay.textContent = selectedDecorationType ? selectedDecorationType : 'None';
    }
}

/**
 * Initializes the game state and starts the game loop.
 */
function initGame() {
    // Set initial values
    money = 100;
    fishInLake = 0; // Start with no fish, player needs to add them
    visitors = 0;   // Start with zero visitors, they will be attracted

    // Update UI once to show initial state
    updateUIDisplay();

    // Initialize Canvas
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    ctx = canvas.getContext('2d');
    canvas.width = 600; // Fixed width for now
    canvas.height = 400; // Fixed height for now
    console.log(`Canvas initialized with width: ${canvas.width}, height: ${canvas.height}`);

    // Canvas click listener for placing decorations
    canvas.addEventListener('click', (event) => {
        if (!selectedDecorationType) return; // Do nothing if no decoration is selected

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        lakeDecorations.push({ type: selectedDecorationType, x: x, y: y });
        // Optional: Deselect after placing
        // selectedDecorationType = null; 
        // updateSelectedDecorationDisplay();
    });

    // Start the game loop, calling gameLoop every 1000 milliseconds (1 second)
    setInterval(gameLoop, 1000);

    console.log("Game initialized.");
}

// Event listener to ensure initGame is called after the DOM is fully loaded
// Ensure that initGame is called after the DOM is fully loaded and the elements are available.
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements here, after DOM is loaded.
    // This is a good practice, although in this specific case,
    // getElementById would work even if script is at the end of body.
    // However, if script was in <head>, this would be crucial.
    // Note: The const declarations for displays are already at the top level,
    // which is fine as long as they are assigned after DOMContentLoaded or the script is deferred/at end of body.
    // For this task, we'll rely on the script being at the end of the body, so direct assignment is okay.

    // Get button references and attach event listeners
    // const buyFishButton = document.getElementById('buy-fish-button'); // Removed as buttons are dynamic now
    // if (buyFishButton) { // Removed
    //     buyFishButton.addEventListener('click', buyFish); // Removed
    // }

    populateShop(); // Populate the shop with fish options
    initGame(); // Call initGame which now uses the globally defined display elements.
});
