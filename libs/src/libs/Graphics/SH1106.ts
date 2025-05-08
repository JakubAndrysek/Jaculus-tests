import { I2C } from "i2c";
import { DisplayDriver } from "./Graphics.js"; // Adjusted import path
import { FONT_5X7 } from "./Fonts.js"; // Import font from new file

const enum SH1106_CMDS {
    // Fundamental Commands
    SET_CONTRAST = 0x81,
    ENTIRE_DISPLAY_ON_RESUME = 0xA4, // Resume to RAM content display
    ENTIRE_DISPLAY_ON_IGNORE = 0xA5, // Entire display ON, ignore RAM
    SET_NORMAL_DISPLAY = 0xA6,
    SET_INVERSE_DISPLAY = 0xA7,
    SET_DISPLAY_OFF = 0xAE,
    SET_DISPLAY_ON = 0xAF,

    // Addressing Setting Commands
    SET_MEMORY_ADDR_MODE = 0x20,
    // SET_COLUMN_ADDR = 0x21,      // For Horizontal/Vertical addressing modes
    // SET_PAGE_ADDR_MODE = 0x22,   // For Horizontal/Vertical addressing modes
    SET_LOWER_COL_START_ADDR = 0x00, // Set Lower Column Start Address for Page Addressing Mode (00h~0Fh)
    SET_HIGHER_COL_START_ADDR = 0x10,// Set Higher Column Start Address for Page Addressing Mode (10h~1Fh)
    SET_PAGE_START_ADDR = 0xB0,    // Set Page Start Address for Page Addressing Mode (B0h~B7h)

    // Hardware Configuration Commands
    SET_DISPLAY_START_LINE = 0x40, // Set display RAM display start line register from 0-63 (0x40-0x7F)
    SET_SEGMENT_REMAP_NORMAL = 0xA0, // Column address 0 is mapped to SEG0
    SET_SEGMENT_REMAP_REVERSE = 0xA1,// Column address 131 is mapped to SEG0
    SET_MULTIPLEX_RATIO = 0xA8,
    SET_COM_OUTPUT_SCAN_DIR_NORMAL = 0xC0, // Normal mode (RESET) Scan from COM0 to COM[N –1]
    SET_COM_OUTPUT_SCAN_DIR_REMAPPED = 0xC8,// Remapped mode. Scan from COM[N-1] to COM0
    SET_DISPLAY_OFFSET = 0xD3,
    SET_COM_PINS_HW_CONFIG = 0xDA,

    // Timing & Driving Scheme Setting Commands
    SET_DISPLAY_CLOCK_DIV_OSC_FREQ = 0xD5,
    SET_PRECHARGE_PERIOD = 0xD9,
    SET_VCOMH_DESELECT_LEVEL = 0xDB,

    // Charge Pump Command
    SET_CHARGE_PUMP_SETTING = 0x8D,
    CHARGE_PUMP_ENABLE = 0x14,
    CHARGE_PUMP_DISABLE = 0x10,

    NOP = 0xE3
}

const SH1106_DEFAULT_ADDRESS = 0x3C;
const SH1106_WIDTH = 128;
const SH1106_HEIGHT = 64;
// const SH1106_PAGES = SH1106_HEIGHT / 8; // Now calculated in base class
const SH1106_COLUMN_OFFSET = 0; // For SH1106, data often starts at column 2 for 128-wide displays, but can be 0.

export class SH1106 extends DisplayDriver {
    private columnOffset: number;

    constructor(i2c: I2C, address: number = SH1106_DEFAULT_ADDRESS, columnOffset: number = SH1106_COLUMN_OFFSET) {
        super(i2c, address, SH1106_WIDTH, SH1106_HEIGHT);
        this.columnOffset = columnOffset;
        // Set default font
        super.setFont(FONT_5X7);
        this.init();
    }

    protected sendCommand(cmd: number, params?: Uint8Array | number[]) {
        // Control byte 0x00: Co=0 (last control byte), D/C#=0 (command)
        const dataPayload = params ? Uint8Array.from([cmd, ...params]) : Uint8Array.from([cmd]);
        this.i2c.writeTo(this.address, Uint8Array.from([0x00, ...dataPayload]));
    }

    protected sendData(data: Uint8Array) {
        // Control byte 0x40: Co=0 (last control byte), D/C#=1 (data)
        const packet = new Uint8Array(1 + data.length);
        packet[0] = 0x40;
        packet.set(data, 1);
        this.i2c.writeTo(this.address, packet);
    }

    init() {
        this.sendCommand(SH1106_CMDS.SET_DISPLAY_OFF);

        // Set Memory Addressing Mode to Page Addressing Mode (0x02)
        this.sendCommand(SH1106_CMDS.SET_MEMORY_ADDR_MODE, [0x02]);

        this.sendCommand(SH1106_CMDS.SET_DISPLAY_CLOCK_DIV_OSC_FREQ, [0x80]);
        this.sendCommand(SH1106_CMDS.SET_MULTIPLEX_RATIO, [this.height - 1]);
        this.sendCommand(SH1106_CMDS.SET_DISPLAY_OFFSET, [0x00]);
        this.sendCommand(SH1106_CMDS.SET_DISPLAY_START_LINE | 0x00);

        this.sendCommand(SH1106_CMDS.SET_CHARGE_PUMP_SETTING, [SH1106_CMDS.CHARGE_PUMP_ENABLE]);

        // Default to (0,0) at top-left.
        // For SH1106, SEGMENT_REMAP_NORMAL (A0) and COM_OUTPUT_SCAN_DIR_REMAPPED (C8)
        // often corresponds to this. Some modules might vary.
        this.sendCommand(SH1106_CMDS.SET_SEGMENT_REMAP_REVERSE); // Or _REVERSE depending on module
        this.sendCommand(SH1106_CMDS.SET_COM_OUTPUT_SCAN_DIR_REMAPPED); // Or _NORMAL depending on module

        this.sendCommand(SH1106_CMDS.SET_COM_PINS_HW_CONFIG, [0x12]); // For 64 rows
        this.sendCommand(SH1106_CMDS.SET_CONTRAST, [0xCF]); // Default contrast
        this.sendCommand(SH1106_CMDS.SET_PRECHARGE_PERIOD, [0xF1]);
        this.sendCommand(SH1106_CMDS.SET_VCOMH_DESELECT_LEVEL, [0x40]);
        this.sendCommand(SH1106_CMDS.ENTIRE_DISPLAY_ON_RESUME);
        this.sendCommand(SH1106_CMDS.SET_NORMAL_DISPLAY);
        this.sendCommand(SH1106_CMDS.SET_DISPLAY_ON);

        this.clear(); // Clear buffer from base class
        this.display(); // Display cleared buffer
    }

    // clear() is inherited from DisplayDriver
    // drawPixel() is inherited from DisplayDriver
    // drawChar() is inherited from DisplayDriver
    // drawText() is inherited from DisplayDriver

    display() {
        for (let page = 0; page < this.pages; page++) {
            this.sendCommand(SH1106_CMDS.SET_PAGE_START_ADDR | page);

            // Set column start address with offset
            const colAddr = this.columnOffset;
            this.sendCommand(SH1106_CMDS.SET_LOWER_COL_START_ADDR | (colAddr & 0x0F));
            this.sendCommand(SH1106_CMDS.SET_HIGHER_COL_START_ADDR | ((colAddr >> 4) & 0x0F));

            const start = page * this.width;
            const end = start + this.width;
            // Ensure we only send a slice that matches the display's physical width from the buffer
            this.sendData(this.buffer.subarray(start, end));
        }
    }

    setContrast(contrast: number) {
        this.sendCommand(SH1106_CMDS.SET_CONTRAST, [contrast & 0xFF]);
    }

    on() {
        this.sendCommand(SH1106_CMDS.SET_DISPLAY_ON);
    }

    off() {
        this.sendCommand(SH1106_CMDS.SET_DISPLAY_OFF);
    }
}

export function connect(i2c: I2C, address?: number, columnOffset?: number): SH1106 {
    return new SH1106(i2c, address, columnOffset);
}
