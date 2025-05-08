import { I2C } from "i2c";

/**
 * Copyright (c) 2014 Peter Clarke. See the file LICENSE for copying permission.
 * modified from Espruino's DS3231 module (https://www.espruino.com/DS3231)
 **/

const enum DS3231_CONSTANTS {
    I2C_ADDRESS = 0x68,
    REG_SECONDS = 0x00,
    REG_MINUTES = 0x01,
    REG_HOURS = 0x02,
    REG_DAY_OF_WEEK = 0x03,
    REG_DATE = 0x04,
    REG_MONTH = 0x05,
    REG_YEAR = 0x06,
}

// Convert Decimal value to BCD
function dec2bcd(val: number): number {
    return Math.floor(val / 10) * 16 + (val % 10);
}

// Convert BCD value to decimal
function bcd2dec(val: number): number {
    return Math.floor(val / 16) * 10 + (val % 16);
}

// Formatting
function format(val: number): string {
    return ("0" + val).substr(-2);
}

export interface DS3231Options {
    DST?: boolean;
}

export class DS3231 {
    private i2c: I2C;
    private options: DS3231Options;
    private dstStatus: boolean;

    constructor(i2c: I2C, options?: DS3231Options) {
        this.i2c = i2c;
        this.options = options || {};
        if (this.options.DST === undefined) {
            this.options.DST = true;
        }
        this.dstStatus = false; // Initial DST status
    }

    // Return whether the supplied date is part of daylight saving time or not (UK specific)
    private isDST(day: number, month: number, dow: number): boolean {
        if (!this.options.DST) {
            return false;
        }
        // Simplified DST logic, original was UK specific and might need adjustment
        // This is a placeholder and might need to be adapted for specific DST rules
        if (month === 3 && dow === 7 && day > 23) { // Last Sunday in March
            return true;
        }
        if (month === 10 && dow === 7 && day > 23) { // Last Sunday in October
            return false;
        }
        if (month > 3 && month < 10) {
            return true;
        }
        return false;
    }

    setDow(dayOfWeek: string): void {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; // Standard: 0=Sunday
        let idx = days.indexOf(dayOfWeek);
        if (idx < 0) {
            console.log("Not a valid day");
            return;
        }
        // DS3231 DOW is 1-7, Sunday=1. The provided JS code had Monday=1.
        // Let's stick to Sunday=1 to be more standard with some RTCs, or adjust if needed.
        // The original code used dec2bcd(1+idx) with Monday as first element.
        // If Sunday is 1, then it's dec2bcd(idx + 1) if days array starts with Sunday.
        // If original code's "Monday" (idx=0) should be DOW 1, then it's dec2bcd(idx+1).
        // If "Sunday" (idx=6 with original days array) should be DOW 7, then it's dec2bcd(idx+1).
        // Let's assume the original intent was 1=Monday, ..., 7=Sunday.
        // The DS3231 register takes 1-7.
        // If days = ["Monday",...,"Sunday"], then Monday (idx 0) -> 1, Sunday (idx 6) -> 7. So, idx+1.
        const originalDays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        idx = originalDays.indexOf(dayOfWeek);
         if (idx < 0) {
            console.log("Not a valid day");
        } else {
            this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, [DS3231_CONSTANTS.REG_DAY_OF_WEEK, dec2bcd(idx + 1)]);
        }
    }

    setDate(date: number, month: number, year: number): void {
        // year is YY format (00-99)
        this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, [DS3231_CONSTANTS.REG_DATE, dec2bcd(date)]);
        this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, [DS3231_CONSTANTS.REG_MONTH, dec2bcd(month)]); // Century bit is not handled here
        this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, [DS3231_CONSTANTS.REG_YEAR, dec2bcd(year)]);
        // Assuming DOW is set separately or not critical for this basic setDate
        // For DST check, we need DOW. The original code implies DOW is available when isDST is called.
        // This might be problematic if DOW is not read before this call.
        // For simplicity, we'll keep it, but in a real scenario, ensure DOW is accurate.
        // const currentDow = bcd2dec(this.i2c.readFrom(DS3231_CONSTANTS.I2C_ADDRESS, 1)[0] & 0x07); // Example to read DOW
        // this.dstStatus = this.isDST(date, month, currentDow);
    }

    setTime(hour: number, minute: number, second: number = 0): void {
        this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, [DS3231_CONSTANTS.REG_SECONDS, dec2bcd(second)]); // Also clears OSF bit
        this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, [DS3231_CONSTANTS.REG_MINUTES, dec2bcd(minute)]);
        // Hour format (12/24) is determined by bit 6 of hour register. Assuming 24hr format.
        this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, [DS3231_CONSTANTS.REG_HOURS, dec2bcd(hour)]); // Assuming 24hr mode
    }

    readDateTime(): string {
        this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, DS3231_CONSTANTS.REG_SECONDS);
        const data = this.i2c.readFrom(DS3231_CONSTANTS.I2C_ADDRESS, 7);

        let seconds = bcd2dec(data[0] & 0x7F); // Mask bit 7 (OSF)
        let minutes = bcd2dec(data[1] & 0x7F);
        let hours = bcd2dec(data[2] & 0x3F); // Assuming 24hr mode (mask bits 6 and 7)
        let dow = bcd2dec(data[3] & 0x07); // Day of week 1-7
        let date = bcd2dec(data[4] & 0x3F);
        let month = bcd2dec(data[5] & 0x1F); // Mask bit 7 (Century)
        let year = bcd2dec(data[6]); // YY format

        // DST Logic from original code
        // Note: This DST logic is specific and might need adjustment.
        // It also writes to the RTC during a read operation, which can be unusual.
        const currentDst = this.isDST(date, month, dow);
        if (this.options.DST) {
            if (hours === 1 && minutes === 0 && seconds === 0 && currentDst === true && this.dstStatus === false) { // clocks go forward
                hours = 2;
                this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, [DS3231_CONSTANTS.REG_HOURS, dec2bcd(hours)]);
                this.dstStatus = true;
            }

            if (hours === 2 && minutes === 0 && seconds === 0 && currentDst === false && this.dstStatus === true) { // clocks go back
                hours = 1;
                this.i2c.writeTo(DS3231_CONSTANTS.I2C_ADDRESS, [DS3231_CONSTANTS.REG_HOURS, dec2bcd(hours)]);
                this.dstStatus = false;
            }
        }

        const rtcDate = `${format(date)}/${format(month)}/${format(year)}`;
        const rtcTime = `${format(hours)}:${format(minutes)}:${format(seconds)}`;
        return `${rtcDate} ${rtcTime}`;
    }
}

export function connect(i2c: I2C, options?: DS3231Options): DS3231 {
    return new DS3231(i2c, options);
}
