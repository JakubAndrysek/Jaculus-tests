import { LED_WS2812, SmartLed } from "smartled"
import { Pins } from "../libs/robutek.js"
import { I2C1 } from "i2c"
import { TSL2561 } from "../libs/TSL2561.js"; // Import the TSL2561 sensor library

// const ledStrip = new SmartLed(Pins.ILED, 1, LED_WS2812);

// ledStrip.clear(); // Zhasne LEDku na Robůtkovi, jenom pro jistotu, kdyby už předtím svítila
// // ledStrip.set(0, { r: 255, g: 0, b: 0 }); // Nastaví první LEDku na červenou barvu, LEDky začínají na indexu 0
// ledStrip.show(); // Rozsvítí LEDku s červenou, kterou jsme si nastavili

// setInterval(() => { // pravidelně vyvolává událost
//   console.log("Robotický tábor 2024, zdraví Jirka Vácha!"); // vypíše text: Robotický tábor 2024, zdraví Jirka Vácha!
// }, 1000); // čas opakování se udává v milisekundách (1000 ms je 1 sekunda)

// Configure I2C for TSL2561 sensor
// Make sure these pins are correct for your Robutek board and TSL2561 connection
I2C1.setup({ sda: 48, scl: 47, bitrate: 100000 });

// Create a new TSL2561 sensor instance
const luminositySensor = new TSL2561(I2C1);

// Main loop to read and print luminosity
setInterval(() => {
  try {
    const luminosity = luminositySensor.readLuminosity();
    console.log("Luminosity: " + luminosity);
  } catch (error) {
    console.error("Error reading luminosity: " + error);
    // Optionally, you might want to try re-initializing the sensor or I2C bus here
    // Or simply stop the interval if errors persist
  }
}, 200); // Read every 2 seconds

