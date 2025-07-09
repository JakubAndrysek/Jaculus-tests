import { LED_WS2812, SmartLed } from "smartled"
import { I2C1 } from "i2c"

import { SH1106 } from "./libs/Graphics/SH1106.js"; // Import the SH1106 library
import { SSD1306 } from "./libs/Graphics/SSD1306.js"; // Import the SH1106 library
import { FONT_5X7 } from "./libs/Graphics/Fonts.js"; // Import the FONT_5X7 from the new Fonts.ts file
// import { connect as connectSH1106 } from "./libs/SH1106.js"; // Old import

import { createRobutek } from "./libs/robutek.js"
const robutek = createRobutek("V2");


I2C1.setup({ sda: robutek.Pins.SDA, scl: robutek.Pins.SCL, bitrate: 100000 });


const display = new SH1106(I2C1);
// const display = new SSD1306(I2C1);

display.setFont(FONT_5X7); // Set the font to FONT_5X7

// Clear the display
display.clear();

// Draw some pixels
display.drawPixel(0, 0, true);
display.drawPixel(127, 0, true);
display.drawPixel(0, 63, true);
display.drawPixel(127, 63, true);
// display.drawPixel(64, 32, true); // Center pixel

// Draw a horizontal line
for (let x = 10; x < 118; x++) {
    display.drawPixel(x, 10, true);
}

// Draw a vertical line
for (let y = 20; y < 54; y++) {
    display.drawPixel(20, y, true);
}

// Draw text using the new font system
display.drawText(64, 39, "A", true);
display.drawText(5, 20, "AH", true);
display.drawText(64, 20, "AH", true); // Changed to match the reported problematic line
// The following lines might be too long for the 5x7 font on a 128-pixel wide display if not handled by drawText word wrapping (which is not implemented here)

// console.log("SH1106 Demo Initialized. Display should show some pixels and lines.");
display.drawText(5, 50, "uvwxyz 012345", true); // Shorter for example

display.display();
await sleep(1000);

// drawCircle
display.clear();
display.drawCircle(64, 32, 20, true);
display.display();
await sleep(1000);


// fillCircle
display.clear();
display.fillCircle(64, 32, 20, false); // Draw a filled circle
display.display();
await sleep(1000);


// drawRectangle
display.clear();
display.drawRectangle(0, 0, 128, 64, true); // Draw a rectangle covering the entire display
display.display();
await sleep(1000);


// drawCircle
display.clear();
display.fillRectangle(64, 32, 20, 20, true); // Draw a filled rectangle at the center of the display
display.display();
await sleep(1000);


let counter = 0; // Initialize a counter
setInterval(() => {
    counter++; // Increment counter
    display.clear(); // Clear display before drawing new text
    display.drawText(5, 30, `Counter: ${counter}`, true); // Draw the counter value
    console.log(`Counter: ${counter}`); // Print counter to console
    display.display();
}, 1000); // Added a 1000ms interval for every second

console.log("SH1106 Demo Initialized. Display should show some pixels and lines.");

