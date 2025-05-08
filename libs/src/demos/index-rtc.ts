import { LED_WS2812, SmartLed } from "smartled"
import { Pins } from "../libs/robutek.js"
import { I2C1 } from "i2c"
import { TSL2561 } from "../libs/TSL2561.js"; // Import the TSL2561 sensor library
import { DS3231 } from "../libs/DS3231.js"; // Import the DS3231 RTC library

I2C1.setup({ sda: 48, scl: 47, bitrate: 100000 });

// Initialize DS3231 RTC
const rtc = new DS3231(I2C1);

// // Set date and time to a fixed value (e.g., "compile time")
// // Current date: May 8, 2025, Time: 12:00:00, Day: Thursday
// const COMPILE_TIME_YEAR = 25; // YY format
// const COMPILE_TIME_MONTH = 5;  // 1-12
// const COMPILE_TIME_DATE = 8;   // 1-31
// const COMPILE_TIME_DAY_OF_WEEK = "Thursday"; // As per DS3231.setDow requirement
// const COMPILE_TIME_HOURS = 18; // 0-23
// const COMPILE_TIME_MINUTES = 59;  // 0-59
// const COMPILE_TIME_SECONDS = 0;  // 0-59

// try {
//     console.log("Setting RTC to compile time: 2025-05-08 12:00:00 Thursday");
//     rtc.setDate(COMPILE_TIME_DATE, COMPILE_TIME_MONTH, COMPILE_TIME_YEAR);
//     rtc.setTime(COMPILE_TIME_HOURS, COMPILE_TIME_MINUTES, COMPILE_TIME_SECONDS);
//     rtc.setDow(COMPILE_TIME_DAY_OF_WEEK);
//     console.log("RTC time set successfully.");
//     const currentRtcTime = rtc.readDateTime();
//     console.log("Current RTC time after setting: " + currentRtcTime);
// } catch (e: any) {
//     console.log("Error setting RTC time: " + e.toString());
// }

// Example usage:
function readSensors() {

    // Read RTC
    try {
        const dateTime = rtc.readDateTime();
        console.log("Date/Time: " + dateTime);
    } catch (e: any) {
        console.log("Error reading DS3231: " + e.toString());
    }
}

// Set an interval to read sensors every 5 seconds
setInterval(readSensors, 5000);

// You can also set the time and date on the RTC like this:
// rtc.setDate(8, 5, 24); // May 8, 2024 (Day, Month, Year YY)
// rtc.setTime(10, 30, 0); // 10:30:00
// rtc.setDow("Thursday");

console.log("Robutek Light Sensor and RTC initialized.");
console.log("Reading sensors every 5 seconds...");

