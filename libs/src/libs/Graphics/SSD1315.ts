import { I2C } from "i2c";
import { DisplayDriver } from "./Graphics.js";
import { FONT_5X7 } from "./Fonts.js"; // Assuming FONT_5X7 is now exported from Fonts.ts

const enum SSD1315_CMDS {
    // Fundamental Commands
    SET_CONTRAST = 0x81,
    ENTIRE_DISPLAY_ON_RESUME = 0xA4,
    ENTIRE_DISPLAY_ON_IGNORE = 0xA5,
    SET_NORMAL_DISPLAY = 0xA6,
    SET_INVERSE_DISPLAY = 0xA7,
    SET_DISPLAY_OFF = 0xAE,
    SET_DISPLAY_ON = 0xAF,

    // Addressing Setting Commands
    SET_MEMORY_ADDR_MODE = 0x20,
    SET_COLUMN_ADDR = 0x21,      // For Horizontal/Vertical addressing modes
    SET_PAGE_ADDR = 0x22,        // For Horizontal/Vertical addressing modes
    SET_LOWER_COL_START_ADDR = 0x00, // For Page Addressing Mode (00h~0Fh)
    SET_HIGHER_COL_START_ADDR = 0x10,// For Page Addressing Mode (10h~1Fh)
    SET_PAGE_START_ADDR = 0xB0,    // For Page Addressing Mode (B0h~B7h)

    // Hardware Configuration Commands
    SET_DISPLAY_START_LINE = 0x40, // Set display RAM display start line register from 0-63 (0x40-0x7F)
    SET_SEGMENT_REMAP_NORMAL = 0xA0,
    SET_SEGMENT_REMAP_REVERSE = 0xA1,
    SET_MULTIPLEX_RATIO = 0xA8,
    SET_COM_OUTPUT_SCAN_DIR_NORMAL = 0xC0,
    SET_COM_OUTPUT_SCAN_DIR_REMAPPED = 0xC8,
    SET_DISPLAY_OFFSET = 0xD3,
    SET_COM_PINS_HW_CONFIG = 0xDA,

    // Timing & Driving Scheme Setting Commands
    SET_DISPLAY_CLOCK_DIV_OSC_FREQ = 0xD5,
    SET_PRECHARGE_PERIOD = 0xD9,
    SET_VCOMH_DESELECT_LEVEL = 0xDB,
    NOP = 0xE3,

    // Charge Pump Command
    SET_CHARGE_PUMP_SETTING = 0x8D,
    CHARGE_PUMP_ENABLE = 0x14,
    CHARGE_PUMP_DISABLE = 0x10,
}

const SSD1315_DEFAULT_ADDRESS = 0x3C;
const SSD1315_WIDTH = 128;
const SSD1315_HEIGHT = 64; // Or 32, depending on the specific module

export class SSD1315 extends DisplayDriver {

    constructor(i2c: I2C, address: number = SSD1315_DEFAULT_ADDRESS, width: number = SSD1315_WIDTH, height: number = SSD1315_HEIGHT) {
        super(i2c, address, width, height);
        super.setFont(FONT_5X7); // Set default font, assuming FONT_5X7 is accessible
        this.init();
    }

    protected sendCommand(cmd: number, params?: Uint8Array | number[]) {
        const dataPayload = params ? Uint8Array.from([cmd, ...params]) : Uint8Array.from([cmd]);
        this.i2c.writeTo(this.address, Uint8Array.from([0x00, ...dataPayload])); // 0x00 for command
    }

    protected sendData(data: Uint8Array) {
        const packet = new Uint8Array(1 + data.length);
        packet[0] = 0x40; // 0x40 for data
        packet.set(data, 1);
        this.i2c.writeTo(this.address, packet);
    }

    init() {
        this.sendCommand(SSD1315_CMDS.SET_DISPLAY_OFF);
        this.sendCommand(SSD1315_CMDS.SET_DISPLAY_CLOCK_DIV_OSC_FREQ, [0x80]);
        this.sendCommand(SSD1315_CMDS.SET_MULTIPLEX_RATIO, [this.height - 1]);
        this.sendCommand(SSD1315_CMDS.SET_DISPLAY_OFFSET, [0x00]);
        this.sendCommand(SSD1315_CMDS.SET_DISPLAY_START_LINE | 0x00);
        this.sendCommand(SSD1315_CMDS.SET_CHARGE_PUMP_SETTING, [SSD1315_CMDS.CHARGE_PUMP_ENABLE]);
        this.sendCommand(SSD1315_CMDS.SET_MEMORY_ADDR_MODE, [0x00]); // Horizontal addressing mode for SSD1315 often default
        this.sendCommand(SSD1315_CMDS.SET_SEGMENT_REMAP_REVERSE); // Often A1 for 128x64
        this.sendCommand(SSD1315_CMDS.SET_COM_OUTPUT_SCAN_DIR_REMAPPED); // Often C8 for 128x64

        if (this.height === 64) {
            this.sendCommand(SSD1315_CMDS.SET_COM_PINS_HW_CONFIG, [0x12]);
        } else if (this.height === 32) {
            this.sendCommand(SSD1315_CMDS.SET_COM_PINS_HW_CONFIG, [0x02]);
        }

        this.sendCommand(SSD1315_CMDS.SET_CONTRAST, [0xCF]); // Default contrast
        this.sendCommand(SSD1315_CMDS.SET_PRECHARGE_PERIOD, [0xF1]);
        this.sendCommand(SSD1315_CMDS.SET_VCOMH_DESELECT_LEVEL, [0x40]); // Or 0x30
        this.sendCommand(SSD1315_CMDS.ENTIRE_DISPLAY_ON_RESUME);
        this.sendCommand(SSD1315_CMDS.SET_NORMAL_DISPLAY);
        this.sendCommand(SSD1315_CMDS.SET_DISPLAY_ON);

        this.clear();
        this.display();
    }

    display() {
        // For SSD1315 in Page Addressing Mode (which the base class drawPixel assumes)
        // If Horizontal/Vertical addressing mode is used, this needs to be different.
        // The init sequence sets Horizontal mode (0x00 for 0x20 command), so we adjust.

        this.sendCommand(SSD1315_CMDS.SET_COLUMN_ADDR, [0, this.width - 1]);
        this.sendCommand(SSD1315_CMDS.SET_PAGE_ADDR, [0, this.pages - 1]);
        this.sendData(this.buffer);
    }

    setContrast(contrast: number) {
        this.sendCommand(SSD1315_CMDS.SET_CONTRAST, [contrast & 0xFF]);
    }

    on() {
        this.sendCommand(SSD1315_CMDS.SET_DISPLAY_ON);
    }

    off() {
        this.sendCommand(SSD1315_CMDS.SET_DISPLAY_OFF);
    }
}

export function connect(i2c: I2C, address?: number, width?: number, height?: number): SSD1315 {
    return new SSD1315(i2c, address, width, height);
}
