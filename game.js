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
let visitors = 0; // Will be initialized in initGame and updated to activeVisitors.length
// let visitorIncomePerSecond = 1; // Renamed to visitorIncomeBase
let visitorIncomeBase = 1; // Income per visitor per second
let fishIncomeMultiplier = 0.1; // Each fish adds this much to income per second
let maxVisitors = 5; // Maximum number of visitors (Changed from 10)
let visitorAttractionRate = 0.01; // Chance per second per fish to attract a new visitor
let activeVisitors = []; // Array to store visitor objects
let visitorIdCounter = 0; // For generating unique visitor IDs

// Reproduction Variables
let baseReproductionChance = 0.0005; // Per fish, per second
let feederReproductionBoost = 0.0005; // Additional chance if feeder is active

// Visual Fish Animation Variables
let visualFishAnimations = []; // Array to store active visual fish objects
let visualFishSpawnChance = 0.02; // Base chance per second to try spawning a visual fish if any fish are owned
let maxVisualFish = 10; // Max number of visual fish on screen at once

// Tilemap Constants
const TILE_TYPES = {
    WATER: 0,
    LAND: 1,
    TREE: 2
};

const TILE_COLORS = {
    [TILE_TYPES.WATER]: '#4fc3f7', // Light blue
    [TILE_TYPES.LAND]: '#9B7653',  // Brownish
    [TILE_TYPES.TREE]: '#228B22'   // Forest Green
};

// Tilemap Variables
let tileSize = 20; 
let tileRows; // Will be calculated in initGame
let tileCols; // Will be calculated in initGame
let tilemap = []; 

// Lake Boundaries (in pixels)
let lakeMinX, lakeMinY, lakeMaxX, lakeMaxY;

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
    if (visitorDisplay) visitorDisplay.textContent = Math.floor(activeVisitors.length); // Use activeVisitors.length
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
    if (totalFish > 0 && activeVisitors.length < maxVisitors) {
        let attractionChance = totalFish * visitorAttractionRate;
        if (Math.random() < attractionChance) {
            const fishingSpot = findValidFishingSpot();
            if (fishingSpot) {
                visitorIdCounter++;
                const newVisitor = {
                    id: visitorIdCounter,
                    x: canvas.width - 1, // Spawn just on the edge of the canvas
                    y: Math.min(canvas.height - 1, Math.max(0, Math.random() * canvas.height)), // Ensure Y is within canvas bounds
                    targetX: fishingSpot.x,
                    targetY: fishingSpot.y,
                    state: "arriving",
                    speed: 1 + Math.random() // Speed between 1 and 2 pixels per update
                };
                activeVisitors.push(newVisitor);
                visitors = activeVisitors.length; // Update old counter for compatibility if needed elsewhere
                console.log(`Visitor ${newVisitor.id} spawned at Px(${newVisitor.x.toFixed(1)}, ${newVisitor.y.toFixed(1)}), target TILE(${fishingSpot.col},${fishingSpot.row}). Total: ${activeVisitors.length}`);
            }
        }
    }

    // 3. Update Visitors
    updateVisitors();

    // 4. Update UI
    updateUIDisplay(); // Handles Math.floor for money display

    // 5. Check for new unlocks
    checkUnlocks(); // This will call populateShop() if needed

    // 6. Handle fish reproduction
    reproduceFish();

    // 7. Manage visual fish animations
    manageVisualFish();

    // 8. Simulate visitor fishing (will be enhanced later)
    simulateFishing();

    // 9. Render the game on canvas
    render();

    // console.log("Game loop running..."); // Can be noisy
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

    // Draw Tilemap
    for (let row = 0; row < tileRows; row++) {
        for (let col = 0; col < tileCols; col++) {
            const tileType = tilemap[row][col];
            const tileColor = TILE_COLORS[tileType];
            ctx.fillStyle = tileColor;
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
    }

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

    // Draw Visitors
    activeVisitors.forEach(visitor => {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(visitor.x, visitor.y, 6, 0, Math.PI * 2); // Visitor as a black circle (radius 6)
        ctx.fill();

        // Draw catch message
        if (visitor.catchMessage && visitor.catchMessageTimer > 0) {
            ctx.fillStyle = 'white'; // Contrasting color
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(visitor.catchMessage, visitor.x, visitor.y - 10); // Position above the visitor
            ctx.textAlign = 'left'; // Reset alignment
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

    // Initialize Tilemap
    initTilemap();

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
    let anyFishCaughtThisCycle = false;

    activeVisitors.forEach(visitor => {
        if (visitor.state === "fishing") {
            const fishingAttemptChance = 0.1; // 10% chance per visitor per second
            if (Math.random() < fishingAttemptChance) {
                if (getTotalFishCount() === 0) return; // No fish to catch

                let catchableFish = [];
                let totalCatchWeight = 0;

                fishTypes.forEach(type => {
                    if (fishPopulation[type.id] > 0) {
                        let weight = fishPopulation[type.id] / type.difficulty;
                        catchableFish.push({ id: type.id, name: type.name, value: type.value, weight: weight });
                        totalCatchWeight += weight;
                    }
                });

                if (totalCatchWeight === 0) return;

                let randomCatchValue = Math.random() * totalCatchWeight;
                let caughtFishType = null;

                for (const fish of catchableFish) {
                    if (randomCatchValue < fish.weight) {
                        caughtFishType = fish;
                        break;
                    }
                    randomCatchValue -= fish.weight;
                }

                if (caughtFishType) {
                    fishPopulation[caughtFishType.id]--;
                    money += caughtFishType.value;
                    visitor.catchMessage = "Caught!!";
                    visitor.catchMessageTimer = 2; // Display for 2 seconds
                    console.log(`Visitor ${visitor.id} caught a ${caughtFishType.name}! +$${caughtFishType.value}`);
                    anyFishCaughtThisCycle = true;
                }
            }
        }
    });

    if (anyFishCaughtThisCycle) {
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
            
            let newSpeed = 1 + Math.random() * 1; // Pixels per game loop (1 second)
            let newSize = 5 + Math.random() * 5;
            let newMaxAge = 7 + Math.random() * 3; // Max age in seconds
            
            // Calculate valid Y range for spawning
            let minYSpawning = lakeMinY + newSize;
            let maxYSpawning = lakeMaxY - newSize;
            let newStartY;

            if (minYSpawning >= maxYSpawning) { // Lake is too narrow for this fish size
                newStartY = lakeMinY + (lakeMaxY - lakeMinY) / 2; // Center it
            } else {
                newStartY = Math.random() * (maxYSpawning - minYSpawning) + minYSpawning;
            }

            let newStartX, newTargetX;
            let direction;

            if (Math.random() < 0.5) { // Start Left, Target Right
                newStartX = lakeMinX - newSize; // Start with its center just off the visible lake edge
                newTargetX = lakeMaxX + newSize; // Target a point where its center is just off the other visible lake edge
                direction = 1;
            } else { // Start Right, Target Left
                newStartX = lakeMaxX + newSize;
                newTargetX = lakeMinX - newSize;
                direction = -1;
            }
            
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
        vf.x += vf.speed * vf.direction; // Speed is pixels per game loop (1 second)

        // Check for removal conditions
        // Fish is removed if its age exceeds maxAge OR if it has reached/passed its target.
        // targetX is defined such that the fish is fully outside the visible lake bounds when it reaches targetX.
        let hasReachedTarget = (vf.direction > 0 && vf.x >= vf.targetX) || (vf.direction < 0 && vf.x <= vf.targetX);

        if (vf.age > vf.maxAge || hasReachedTarget) {
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

/**
 * Initializes the tilemap data and calculates lake boundaries.
 */
function initTilemap() {
    tileRows = canvas.height / tileSize;
    tileCols = canvas.width / tileSize;

    // Define lake boundaries in terms of tiles
    // Lake should be roughly half the canvas area, centered.
    // Example: if tileCols = 30, lake starts at col 7 and ends at col 22 (15 cols wide)
    // if tileRows = 20, lake starts at row 5 and ends at row 14 (9 rows high)
    const lakeStartCol = Math.floor(tileCols / 4);
    const lakeEndCol = Math.floor(tileCols * 3 / 4) -1; // -1 because it's an index
    const lakeStartRow = Math.floor(tileRows / 4);
    const lakeEndRow = Math.floor(tileRows * 3 / 4) -1; // -1 because it's an index
    
    // Calculate pixel boundaries for the lake
    lakeMinX = lakeStartCol * tileSize;
    lakeMaxX = (lakeEndCol + 1) * tileSize; // +1 because it's the start of the next tile
    lakeMinY = lakeStartRow * tileSize;
    lakeMaxY = (lakeEndRow + 1) * tileSize; // +1 because it's the start of the next tile


    for (let row = 0; row < tileRows; row++) {
        tilemap[row] = [];
        for (let col = 0; col < tileCols; col++) {
            // Check if the current tile is within the lake boundaries
            if (col >= lakeStartCol && col <= lakeEndCol && row >= lakeStartRow && row <= lakeEndRow) {
                tilemap[row][col] = TILE_TYPES.WATER;
            } else {
                tilemap[row][col] = TILE_TYPES.LAND;
            }
        }
    }

    // Add some trees
    const numberOfTrees = 15;
    for (let i = 0; i < numberOfTrees; i++) {
        let treeRow, treeCol;
        let attempts = 0;
        do {
            treeRow = Math.floor(Math.random() * tileRows);
            treeCol = Math.floor(Math.random() * tileCols);
            attempts++;
            if (attempts > 100) break; // Avoid infinite loop if no space
        } while (tilemap[treeRow][treeCol] !== TILE_TYPES.LAND); // Ensure trees are on land

        if (tilemap[treeRow][treeCol] === TILE_TYPES.LAND) {
            tilemap[treeRow][treeCol] = TILE_TYPES.TREE;
        }
    }
    console.log("Tilemap initialized with lake and trees.");
    console.log(`Lake boundaries (pixels): X: ${lakeMinX}-${lakeMaxX}, Y: ${lakeMinY}-${lakeMaxY}`);
}

/**
 * Finds a valid fishing spot (a LAND tile adjacent to a WATER tile).
 * @returns {object|null} An object {x, y, row, col} for the spot, or null if none found.
 */
function findValidFishingSpot() {
    const potentialSpots = [];
    for (let row = 0; row < tileRows; row++) {
        for (let col = 0; col < tileCols; col++) {
            if (tilemap[row][col] === TILE_TYPES.LAND) {
                // Check adjacent tiles (N, S, E, W)
                const neighbors = [
                    { r: row - 1, c: col }, { r: row + 1, c: col },
                    { r: row, c: col - 1 }, { r: row, c: col + 1 }
                ];
                let isAdjacentToWater = false;
                for (const n of neighbors) {
                    if (n.r >= 0 && n.r < tileRows && n.c >= 0 && n.c < tileCols &&
                        tilemap[n.r][n.c] === TILE_TYPES.WATER) {
                        isAdjacentToWater = true;
                        break;
                    }
                }
                if (isAdjacentToWater) {
                    // NEW condition: ensure not on map edge
                    if (row > 0 && row < tileRows - 1 && col > 0 && col < tileCols - 1) {
                        potentialSpots.push({
                            x: col * tileSize + tileSize / 2, // Center of the tile
                            y: row * tileSize + tileSize / 2, // Center of the tile
                            row: row,
                            col: col
                        });
                    }
                }
            }
        }
    }

    if (potentialSpots.length > 0) {
        return potentialSpots[Math.floor(Math.random() * potentialSpots.length)];
    }
    // console.warn can be noisy if it happens often. Consider logging less frequently or having a debug mode.
    // console.warn("No valid non-edge fishing spot found! Trying edge spots as fallback...");

    // Fallback: If no non-edge spots are found, try again allowing edge spots.
    // This prevents a complete failure if the only available spots are on the edge.
    for (let row = 0; row < tileRows; row++) {
        for (let col = 0; col < tileCols; col++) {
            if (tilemap[row][col] === TILE_TYPES.LAND) {
                const neighbors = [
                    { r: row - 1, c: col }, { r: row + 1, c: col },
                    { r: row, c: col - 1 }, { r: row, c: col + 1 }
                ];
                let isAdjacentToWater = false;
                for (const n of neighbors) {
                    if (n.r >= 0 && n.r < tileRows && n.c >= 0 && n.c < tileCols &&
                        tilemap[n.r][n.c] === TILE_TYPES.WATER) {
                        isAdjacentToWater = true;
                        break;
                    }
                }
                if (isAdjacentToWater) {
                    potentialSpots.push({
                        x: col * tileSize + tileSize / 2,
                        y: row * tileSize + tileSize / 2,
                        row: row,
                        col: col
                    });
                }
            }
        }
    }
    if (potentialSpots.length > 0) {
        console.log("Found fishing spot on edge as fallback.");
        return potentialSpots[Math.floor(Math.random() * potentialSpots.length)];
    }

    console.warn("No valid fishing spot found, even including edges!");
    return null; // No suitable spot found
}

/**
 * Updates visitor positions and states.
 */
function updateVisitors() {
    for (let i = activeVisitors.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
        const visitor = activeVisitors[i];

        // Manage catch message timer
        if (visitor.catchMessageTimer && visitor.catchMessageTimer > 0) {
            visitor.catchMessageTimer -= 1;
            if (visitor.catchMessageTimer <= 0) {
                visitor.catchMessage = null;
            }
        }

        if (visitor.state === "arriving") {
            const dx = visitor.targetX - visitor.x;
            const dy = visitor.targetY - visitor.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < visitor.speed) {
                visitor.x = visitor.targetX;
                visitor.y = visitor.targetY;
                visitor.state = "fishing";
                visitor.timeAtSpot = 0;
                visitor.departureTime = Math.floor(Math.random() * 31) + 30; // 30-60 seconds
                console.log(`Visitor ${visitor.id} at Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) TILE(${Math.floor(visitor.x/tileSize)}, ${Math.floor(visitor.y/tileSize)}) reached target. State: fishing. Duration: ${visitor.departureTime}s.`);
            } else {
                const moveX = (dx / distance) * visitor.speed;
                const moveY = (dy / distance) * visitor.speed;
                
                const potentialX = visitor.x + moveX;
                const potentialY = visitor.y + moveY;

                // A. Check if potentialX, potentialY are within canvas bounds
                if (potentialX < 0 || potentialX >= canvas.width || potentialY < 0 || potentialY >= canvas.height) {
                    const currentTileCol = Math.floor(visitor.x / tileSize);
                    const currentTileRow = Math.floor(visitor.y / tileSize);
                    console.warn(`Visitor ${visitor.id} at Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) TILE(${currentTileCol},${currentTileRow}) tried to move off-map to Px(${potentialX.toFixed(1)},${potentialY.toFixed(1)}). Stopping.`);
                    
                    if (currentTileRow >= 0 && currentTileRow < tileRows && currentTileCol >= 0 && currentTileCol < tileCols &&
                        tilemap[currentTileRow][currentTileCol] === TILE_TYPES.LAND) {
                        visitor.state = "fishing";
                        visitor.timeAtSpot = 0;
                        visitor.departureTime = Math.floor(Math.random() * 31) + 30;
                        console.log(`Visitor ${visitor.id} stopped at Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) TILE(${currentTileCol},${currentTileRow}). Current tile is LAND. State: fishing.`);
                    } else {
                        console.error(`Visitor ${visitor.id} stopped at Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) TILE(${currentTileCol},${currentTileRow}). Current tile NOT LAND. Removing.`);
                        activeVisitors.splice(i, 1);
                        visitors = activeVisitors.length;
                    }
                } else {
                    // B. If potentialX, potentialY are within canvas bounds, then check tile type
                    const nextTileCol = Math.floor(potentialX / tileSize);
                    const nextTileRow = Math.floor(potentialY / tileSize);

                    if (nextTileRow >= 0 && nextTileRow < tileRows && nextTileCol >= 0 && nextTileCol < tileCols &&
                        tilemap[nextTileRow][nextTileCol] !== TILE_TYPES.WATER) {
                        // Path is clear (not water, and on map)
                        visitor.x = potentialX;
                        visitor.y = potentialY;
                        // Optional: console.log(`Visitor ${visitor.id} moving to Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) TILE(${nextTileCol},${nextTileRow})`);
                    } else {
                        // Path is blocked by water or an invalid tile
                        const currentTileCol = Math.floor(visitor.x / tileSize);
                        const currentTileRow = Math.floor(visitor.y / tileSize);
                        console.log(`Visitor ${visitor.id} at Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) TILE(${currentTileCol},${currentTileRow}) - path blocked by WATER/INVALID at TILE(${nextTileCol},${nextTileRow}). Stopping.`);
                        
                        if (currentTileRow >= 0 && currentTileRow < tileRows && currentTileCol >= 0 && currentTileCol < tileCols &&
                            tilemap[currentTileRow][currentTileCol] === TILE_TYPES.LAND) {
                            visitor.state = "fishing";
                            visitor.timeAtSpot = 0;
                            visitor.departureTime = Math.floor(Math.random() * 31) + 30;
                            console.log(`Visitor ${visitor.id} stopped at Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) TILE(${currentTileCol},${currentTileRow}). Current tile is LAND. State: fishing.`);
                        } else {
                            console.warn(`Visitor ${visitor.id} stopped at Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) TILE(${currentTileCol},${currentTileRow}). Current tile NOT LAND. Removing.`);
                            activeVisitors.splice(i, 1);
                            visitors = activeVisitors.length;
                        }
                    }
                }
            }
        } else if (visitor.state === "fishing") {
            visitor.timeAtSpot += 1; // Game loop is 1 second
            if (visitor.timeAtSpot > visitor.departureTime) {
                visitor.state = "leaving";
                // Determine closest horizontal exit
                if (visitor.x < canvas.width / 2) {
                    visitor.targetX = -10; // Exit left
                } else {
                    visitor.targetX = canvas.width + 10; // Exit right
                }
                // Keep current Y for horizontal exit, or randomize if preferred
                // visitor.targetY = visitor.y; // Or Math.random() * canvas.height for variation
                console.log(`Visitor ${visitor.id} at Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) TILE(${Math.floor(visitor.x/tileSize)}, ${Math.floor(visitor.y/tileSize)}) finished fishing. State: leaving. Target Px(X=${visitor.targetX.toFixed(1)}).`);
            }
        } else if (visitor.state === "leaving") {
            const dx = visitor.targetX - visitor.x;
            const dy = visitor.targetY - visitor.y; // Y movement is minimal if targetY is same as visitor.y
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < visitor.speed) {
                console.log(`Visitor ${visitor.id} at Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) has left the map.`);
                activeVisitors.splice(i, 1);
                visitors = activeVisitors.length; // Update old counter
            } else {
                // Optional: console.log(`Visitor ${visitor.id} leaving. Moving from Px(${visitor.x.toFixed(1)}, ${visitor.y.toFixed(1)}) towards Px(X=${visitor.targetX.toFixed(1)})`);
                const moveX = (dx / distance) * visitor.speed;
                const moveY = (dy / distance) * visitor.speed; // Will be 0 if targetY = visitor.y
                visitor.x += moveX;
                visitor.y += moveY;
            }
        }
    }
    // Ensure global 'visitors' variable is consistent if it's still used elsewhere directly
    visitors = activeVisitors.length; 
}
