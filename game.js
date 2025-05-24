// Canvas and Context
let canvas;
let ctx;

// Customization Variables
let selectedDecorationType = null;
let lakeDecorations = []; // Array to store placed decorations {type, x, y}

// Game State Variables
let money = 0;
// let fishInLake = 0; // Replaced by fishPopulation
let fishPopulation = {}; // Example: { tilapia: 20, pacu: 0 }
let visitors = 0; // Will be initialized in initGame
// let visitorIncomePerSecond = 1; // Renamed to visitorIncomeBase
let visitorIncomeBase = 1; // Income per visitor per second
let fishIncomeMultiplier = 0.1; // Each fish adds this much to income per second
let maxVisitors = 10; // Maximum number of visitors
let visitorAttractionRate = 0.01; // Chance per second per fish to attract a new visitor

// Reproduction Variables
let baseReproductionChance = 0.0005; // Per fish, per second
let feederReproductionBoost = 0.0005; // Additional chance if feeder is active

// Visual Fish Animation Variables
let visualFishAnimations = []; // Array to store active visual fish objects
let visualFishSpawnChance = 0.02; // Base chance per second to try spawning a visual fish if any fish are owned
let maxVisualFish = 10; // Max number of visual fish on screen at once

// Fish Species Definition
const fishTypes = [
    { id: 'tilapia', name: 'Tilápia', cost: 10, value: 2, unlocked: true, batchSize: 20, difficulty: 1 },
    { id: 'pacu', name: 'Pacu', cost: 25, value: 5, unlocked: true, batchSize: 15, difficulty: 1.5 },
    { id: 'tambaqui', name: 'Tambaqui', cost: 50, value: 10, unlocked: false, moneyNeeded: 200, batchSize: 10, difficulty: 2 }
];

// Structure Definitions
const structures = [
    { id: 'autoFeeder', name: 'Automatic Feeder', cost: 100, incomeBonus: 2, maxOwn: 1 }
];
let ownedStructures = {}; // Example: { autoFeeder: 1 }

// DOM Element References
const moneyDisplay = document.getElementById('money-display');
// const fishDisplay = document.getElementById('fish-display'); // Removed
const visitorDisplay = document.getElementById('visitor-display');
const fishSpeciesCountsDiv = document.getElementById('fish-species-counts');

/**
 * Updates the UI display with the current game state.
 * Ensures that numbers are displayed as whole numbers.
 */
function updateUIDisplay() {
    // Update money display, ensuring it's an integer
    if (moneyDisplay) moneyDisplay.textContent = Math.floor(money);
    
    // Update fish count display for individual species
    // if (fishDisplay) fishDisplay.textContent = getTotalFishCount(); // Removed
    if (fishSpeciesCountsDiv) {
        fishSpeciesCountsDiv.innerHTML = '<h4>Fish Population:</h4>'; // Clear previous counts but keep heading
        fishTypes.forEach(type => {
            const p = document.createElement('p');
            p.textContent = `${type.name}: ${fishPopulation[type.id] || 0}`;
            fishSpeciesCountsDiv.appendChild(p);
        });
    }

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
        fishPopulation[fishTypeId] += selectedFishType.batchSize; // Use batchSize
        updateUIDisplay();
        console.log(`${selectedFishType.batchSize} ${selectedFishType.name}(s) bought!`);
    } else {
        console.log(`Not enough money to buy ${selectedFishType.name}.`);
        // Optional: alert(`Not enough money to buy ${selectedFishType.name}.`);
    }
}

/**
 * Handles fish reproduction logic.
 */
function reproduceFish() {
    let newFishAlerts = [];
    let anyFishReproduced = false;

    for (const speciesId in fishPopulation) {
        if (fishPopulation[speciesId] > 0) {
            let currentChance = baseReproductionChance;
            if (ownedStructures.autoFeeder && ownedStructures.autoFeeder > 0) {
                currentChance += feederReproductionBoost;
            }

            let newBirths = 0;
            for (let i = 0; i < fishPopulation[speciesId]; i++) {
                if (Math.random() < currentChance) {
                    newBirths++;
                }
            }

            if (newBirths > 0) {
                fishPopulation[speciesId] += newBirths;
                const speciesName = fishTypes.find(f => f.id === speciesId)?.name || speciesId;
                newFishAlerts.push(`${newBirths} new ${speciesName}(s) born!`);
                anyFishReproduced = true;
            }
        }
    }

    if (anyFishReproduced) {
        updateUIDisplay(); // Refresh species counts in the UI
        populateShop();    // Refresh counts on shop buttons
        console.log(newFishAlerts.join('\n'));
    }
}

/**
 * Calculates the total number of fish across all species.
 * @returns {number} The total count of fish.
 */
function getTotalFishCount() {
    let total = 0;
    for (const speciesId in fishPopulation) {
        total += fishPopulation[speciesId];
    }
    return total;
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
            // Update button text to include current count and batch size
            button.textContent = `Buy ${fish.name} (${fishPopulation[fish.id] || 0}) [${fish.batchSize}] (Cost: ${fish.cost})`;
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
    // 1. Calculate Income (Old passive income sources removed)
    // let bonusIncomeFromStructures = 0; // Removed
    // if (ownedStructures.autoFeeder && ownedStructures.autoFeeder > 0) { // Removed
    //     const feeder = structures.find(s => s.id === 'autoFeeder'); // Removed
    //     if (feeder) { // Removed
    //         bonusIncomeFromStructures += feeder.incomeBonus; // Removed
    //     } // Removed
    // } // Removed
    // money += (visitors * visitorIncomeBase) + (getTotalFishCount() * fishIncomeMultiplier) + bonusIncomeFromStructures; // Removed
    // Money will now primarily come from catching fish.

    // 2. Attract Visitors
    let totalFish = getTotalFishCount();
    if (totalFish > 0 && visitors < maxVisitors) {
        // Each fish gives a chance to attract a visitor
        let attractionChance = totalFish * visitorAttractionRate;
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

    // Handle fish reproduction
    reproduceFish();

    // Manage visual fish animations
    manageVisualFish();

    // Simulate visitor fishing
    simulateFishing();

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

    // Draw Fish (Old system removed, new system will draw from visualFishAnimations)
    // let fishToDraw = Math.min(getTotalFishCount(), 50); 
    // ctx.fillStyle = 'orange'; 

    // for (let i = 0; i < fishToDraw; i++) {
    //     let fishRadius = 5;
    //     let fishX = Math.random() * (canvas.width - fishRadius * 3) + fishRadius * 2; 
    //     let fishY = Math.random() * (canvas.height - fishRadius * 2) + fishRadius;
    //     ctx.beginPath();
    //     ctx.arc(fishX, fishY, fishRadius, 0, Math.PI * 2);
    //     ctx.fill();
    //     ctx.beginPath();
    //     ctx.moveTo(fishX - fishRadius, fishY); 
    //     ctx.lineTo(fishX - fishRadius * 2, fishY - fishRadius); 
    //     ctx.lineTo(fishX - fishRadius * 2, fishY + fishRadius); 
    //     ctx.closePath();
    //     ctx.fill();
    // }

    // Draw Structures
    // Example: Automatic Feeder
    const feederStructure = structures.find(s => s.id === 'autoFeeder');

    // Draw Animated Fish
    visualFishAnimations.forEach(vf => {
        ctx.fillStyle = vf.color;
        ctx.beginPath();
        ctx.arc(vf.x, vf.y, vf.size, 0, Math.PI * 2); // Simple circle for now
        ctx.fill();
    });

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
    // fishInLake = 0; // Replaced by fishPopulation
    fishTypes.forEach(type => { // Initialize fishPopulation
        fishPopulation[type.id] = 0;
    });
    visitors = 0;   // Start with zero visitors, they will be attracted

    // Add a starting batch of the first fish type
    const firstFishType = fishTypes[0]; // Assuming Tilapia is the first
    if (firstFishType) {
        fishPopulation[firstFishType.id] = firstFishType.batchSize;
        console.log(`Started with ${firstFishType.batchSize} ${firstFishType.name}.`);
    }

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

/**
 * Simulates visitors attempting to catch fish.
 */
function simulateFishing() {
    let fishingHappened = false;

    for (let i = 0; i < visitors; i++) {
        const fishingAttemptChance = 0.1; // 10% chance per visitor per second
        if (Math.random() < fishingAttemptChance) {
            if (getTotalFishCount() === 0) continue; // No fish to catch

            let catchableFish = [];
            let totalCatchWeight = 0;

            fishTypes.forEach(type => {
                if (fishPopulation[type.id] > 0) {
                    // Higher population and lower difficulty = higher weight
                    let weight = fishPopulation[type.id] / type.difficulty; 
                    catchableFish.push({ id: type.id, name: type.name, value: type.value, weight: weight });
                    totalCatchWeight += weight;
                }
            });

            if (totalCatchWeight === 0) continue;

            let randomCatchValue = Math.random() * totalCatchWeight;
            let caughtFish = null;

            for (const fish of catchableFish) {
                if (randomCatchValue < fish.weight) {
                    caughtFish = fish;
                    break;
                }
                randomCatchValue -= fish.weight;
            }

            if (caughtFish) {
                fishPopulation[caughtFish.id]--;
                money += caughtFish.value;
                console.log(`A visitor caught a ${caughtFish.name}! +$${caughtFish.value}`);
                fishingHappened = true;
            }
        }
    }

    if (fishingHappened) {
        updateUIDisplay();
        populateShop(); // To update counts on buttons
    }
}

/**
 * Manages the spawning and updating of visual fish animations.
 */
function manageVisualFish() {
    // Spawning New Visual Fish
    if (getTotalFishCount() > 0 && visualFishAnimations.length < maxVisualFish) {
        let spawnAttemptChance = visualFishSpawnChance + (getTotalFishCount() / 5000); // Chance increases slightly with more fish
        if (Math.random() < spawnAttemptChance) {
            
            let newSpeed = 80 + Math.random() * 40; // Adjusted speed
            let newSize = 5 + Math.random() * 5;
            let newMaxAge = 7 + Math.random() * 3; // Adjusted maxAge in seconds
            // Adjust y to ensure fish is fully visible vertically
            let newStartY = Math.random() * (canvas.height - newSize * 2) + newSize; 

            let newStartX, newTargetX;
            if (Math.random() < 0.5) { // Start Left, Target Right
                newStartX = -newSize; // Start with its center at -newSize (so it's off-screen)
                newTargetX = canvas.width + newSize; // Target its center to be just off-screen right
            } else { // Start Right, Target Left
                newStartX = canvas.width + newSize;
                newTargetX = -newSize;
            }
            
            let direction = (newTargetX > newStartX) ? 1 : -1; // 1 for right, -1 for left

            visualFishAnimations.push({
                x: newStartX,
                y: newStartY,
                targetX: newTargetX,
                targetY: newStartY, // Simple horizontal movement for now
                speed: newSpeed, 
                size: newSize, 
                color: 'gold', // Placeholder color
                age: 0,
                maxAge: newMaxAge,
                direction: direction // Add this
            });
        }
    }

    // Updating Existing Visual Fish
    for (let i = visualFishAnimations.length - 1; i >= 0; i--) {
        let vf = visualFishAnimations[i];
        vf.age++;

        // Apply direction in movement update
        vf.x += vf.speed * vf.direction;

        // Check for removal conditions
        // Original targetX check is fine as targetX is already set to be off-screen
        let reachedTarget = (direction > 0 && vf.x >= vf.targetX) || (direction < 0 && vf.x <= vf.targetX);
        
        if (vf.age > vf.maxAge || reachedTarget) {
            visualFishAnimations.splice(i, 1);
        }
    }
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
