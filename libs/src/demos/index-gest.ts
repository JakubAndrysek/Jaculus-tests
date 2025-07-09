import { LED_WS2812, SmartLed } from "smartled"
import { I2C1 } from "i2c"
import { TSL2561 } from "../libs/TSL2561.js"; // Import the TSL2561 sensor library
import { APDS9960, connect as connectAPDS9960 } from "../libs/APDS9960.js"; // Import the APDS9960 sensor library
import { stdout } from "stdio"; // Import stdout for printing
// import { setInterval, clearInterval } from "timers"; // Import timers for periodic tasks - Removed as they should be global

I2C1.setup({ sda: 48, scl: 47, bitrate: 100000 });

// Initialize TSL2561 sensor
const tsl = new TSL2561(I2C1);
console.log("TSL2561 initialized.");

// Initialize APDS9960 sensor
const apds = connectAPDS9960(I2C1);
console.log("APDS9960 initialized.");

// Example usage of TSL2561
try {
    const luminosity = tsl.readLuminosity();
    console.log(`Current TSL2561 Luminosity: ${luminosity}`);
} catch (e: any) {
    console.error(`Error reading TSL2561: ${e.message}`);
}

// Example usage of APDS9960
try {
    const rgba = apds.getRGBA();
    console.log(`Current APDS9960 RGBA: R=${rgba.r}, G=${rgba.g}, B=${rgba.b}, A=${rgba.a}`);

    const proximity = apds.getProximity();
    console.log(`Current APDS9960 Proximity: ${proximity}`);
} catch (e: any) {
    console.error(`Error reading APDS9960: ${e.message}`);
}

// Periodically read and print sensor data
const intervalId = setInterval(() => {
    try {
        const luminosity = tsl.readLuminosity();
        console.log(`TSL2561 Luminosity: ${luminosity}`);

        const rgba = apds.getRGBA();
        console.log(`APDS9960 RGBA: R=${rgba.r}, G=${rgba.g}, B=${rgba.b}, A=${rgba.a}`);

        const proximity = apds.getProximity();
        console.log(`APDS9960 Proximity: ${proximity}`);

        if (apds.hasGesture()) {
            const gesture = apds.getGesture();
            if (gesture) {
                console.log(`APDS9960 Gesture: ${gesture}`);
            }
        }
        stdout.write("\n"); // Add a newline for better readability in the console

    } catch (e: any) {
        console.error(`Error in periodic sensor reading: ${e.message}`);
        // Optionally, clear the interval if a persistent error occurs
        // clearInterval(intervalId);
    }
}, 1000); // Read every 2 seconds

// To prevent the program from exiting immediately (if not running in a context that keeps it alive)
// you might need a way to keep the event loop running, e.g. if this were a standalone Node.js script.
// In an embedded environment like ESP32 with Moddable SDK (which this looks like),
// the script typically stays alive.

// Example of how to power down sensors when done (e.g., on program exit or specific condition)
// function cleanup() {
//     console.log("Powering down sensors...");
//     tsl.powerDown();
//     // APDS9960 does not have an explicit powerDown in the provided JS,
//     // but disabling features via ENABLE register can save power.
//     // For example, to disable all features:
//     // apds.i2c.writeTo(apds.addr, [0x80 /* R.ENABLE */, 0x00]);
//     console.log("Cleanup complete.");
//     clearInterval(intervalId);
// }

// process.on('SIGINT', cleanup); // Example for Node.js like environments

