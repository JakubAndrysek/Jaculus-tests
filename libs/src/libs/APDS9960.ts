import { I2C } from "i2c";

/**
 * Copyright (C) 2019 Gordon Williams. See the file LICENSE for copying permission.
 * modified from Espruino's APDS9960 module (https://www.espruino.com/APDS9960)
 **/

const enum R {
    ENABLE = 0x80,
    ATIME = 0x81,
    WTIME = 0x83,
    AILTL = 0x84,
    AILTH = 0x85,
    AIHTL = 0x86,
    AIHTH = 0x87,
    PILT = 0x89,
    PIHT = 0x8B,
    PERS = 0x8C,
    CONFIG1 = 0x8D,
    PPULSE = 0x8E,
    CONTROL = 0x8F,
    CONFIG2 = 0x90,
    ID = 0x92,
    STATUS = 0x93,
    CDATAL = 0x94,
    CDATAH = 0x95,
    RDATAL = 0x96,
    RDATAH = 0x97,
    GDATAL = 0x98,
    GDATAH = 0x99,
    BDATAL = 0x9A,
    BDATAH = 0x9B,
    PDATA = 0x9C,
    POFFSET_UR = 0x9D,
    POFFSET_DL = 0x9E,
    CONFIG3 = 0x9F,
    GPENTH = 0xA0,
    GEXTH = 0xA1,
    GCONF1 = 0xA2,
    GCONF2 = 0xA3,
    GOFFSET_U = 0xA4,
    GOFFSET_D = 0xA5,
    GOFFSET_L = 0xA7,
    GOFFSET_R = 0xA9,
    GPULSE = 0xA6,
    GCONF3 = 0xAA,
    GCONF4 = 0xAB,
    GFLVL = 0xAE,
    GSTATUS = 0xAF,
    IFORCE = 0xE4,
    PICLEAR = 0xE5,
    CICLEAR = 0xE6,
    AICLEAR = 0xE7,
    GFIFO_U = 0xFC,
    GFIFO_D = 0xFD,
    GFIFO_L = 0xFE,
    GFIFO_R = 0xFF
}

const DEF = {
    ATIME: 219,     // 103ms
    WTIME: 246,     // 27ms
    PROX_PPULSE: 0x87,    // 16us, 8 pulses
    GESTURE_PPULSE: 0x89,    // 16us, 10 pulses
    POFFSET_UR: 0,       // 0 offset
    POFFSET_DL: 0,       // 0 offset
    CONFIG1: 0x60,    // No 12x wait (WTIME) factor
    LDRIVE: 0, //LED_DRIVE_100MA,
    PGAIN: 2, //PGAIN_4X,
    AGAIN: 1, // AGAIN_4X,
    PILT: 0,       // Low proximity threshold
    PIHT: 50,      // High proximity threshold
    AILT: 0xFFFF,  // Force interrupt for calibration
    AIHT: 0,
    PERS: 0x11,    // 2 consecutive prox or ALS for int.
    CONFIG2: 0x01,    // No saturation interrupts or LED boost
    CONFIG3: 0,       // Enable all photodiodes, no SAI
    GPENTH: 40,      // Threshold for entering gesture mode
    GEXTH: 30,      // Threshold for exiting gesture mode
    GCONF1: 0x40,    // 4 gesture events for int., 1 for exit
    GGAIN: 4, // GGAIN_4X,
    GLDRIVE: 0, // LED_DRIVE_100MA,
    GWTIME: 1, // GWTIME_2_8MS,
    GOFFSET: 0,       // No offset scaling for gesture mode
    GPULSE: 0xC9,    // 32us, 10 pulses
    GCONF3: 0,       // All photodiodes active during gesture
    GIEN: 0       // Disable gesture interrupts
};

export type RGBA = {
    r: number;
    g: number;
    b: number;
    a: number;
};

export type Gesture = "up" | "down" | "left" | "right" | undefined;

export class APDS9960 {
    private i2c: I2C;
    private addr: number = 0x39;

    constructor(i2c: I2C) {
        this.i2c = i2c;
        if (this.r(R.ID) != 0xAB) {
            throw new Error("APDS9960 not found (ID: " + this.r(R.ID) + ")");
        }
        // disable everything initially
        this.w(R.ENABLE, 0);
        /* Set default values for ambient light and proximity registers */
        this.w(R.ATIME, DEF.ATIME);
        this.w(R.WTIME, DEF.WTIME);
        this.w(R.PPULSE, DEF.PROX_PPULSE);
        this.w(R.POFFSET_UR, DEF.POFFSET_UR);
        this.w(R.POFFSET_DL, DEF.POFFSET_DL);
        this.w(R.CONFIG1, DEF.CONFIG1);
        this.w(R.CONTROL, (DEF.LDRIVE << 6) | (DEF.PGAIN << 2) | DEF.AGAIN);
        this.w(R.PILT, DEF.PILT);
        this.w(R.PIHT, DEF.PIHT);
        this.w(R.AILTL, DEF.AILT & 255);
        this.w(R.AILTH, DEF.AILT >> 8);
        this.w(R.AIHTL, DEF.AIHT & 255);
        this.w(R.AIHTH, DEF.AIHT >> 8);
        this.w(R.PERS, DEF.PERS);
        this.w(R.CONFIG2, DEF.CONFIG2);
        this.w(R.CONFIG3, DEF.CONFIG3);
        this.w(R.GPENTH, DEF.GPENTH);
        this.w(R.GEXTH, DEF.GEXTH);
        this.w(R.GCONF1, DEF.GCONF1);
        this.w(R.GCONF2, (DEF.GGAIN << 5) | (DEF.GLDRIVE << 3) | DEF.GWTIME);
        this.w(R.GOFFSET_U, DEF.GOFFSET);
        this.w(R.GOFFSET_D, DEF.GOFFSET);
        this.w(R.GOFFSET_L, DEF.GOFFSET);
        this.w(R.GOFFSET_R, DEF.GOFFSET);
        this.w(R.GPULSE, DEF.GPULSE);
        this.w(R.GCONF3, DEF.GCONF3);
        this.w(R.GCONF4, (this.r(R.GCONF4) & 0b11111101) | (DEF.GIEN << 1));
        // enable everything
        this.w(R.ENABLE, 0x7F); // Enable All features: PON, AEN, PEN, WEN, GEN
    }

    /** Write to I2C register */
    private w(reg: number, data: number) {
        this.i2c.writeTo(this.addr, [reg, data]);
    }

    /** Read from I2C register */
    private r(reg: number): number {
        this.i2c.writeTo(this.addr, reg);
        return this.i2c.readFrom(this.addr, 1)[0];
    }

    /** Check if there has been a gesture recorded or not */
    hasGesture(): boolean {
        return (this.r(R.GSTATUS) & 1) !== 0; // GVALID
    }

    /** Return the current gesture (left/right/up/down) or 'undefined' if none */
    getGesture(): Gesture {
        /* Make sure that power and gesture is on and data is valid */
        if (!this.hasGesture() || !(this.r(R.ENABLE) & 0b01000001)) { // Check GEN and PON
            return undefined;
        }

        /* Read the current FIFO level */
        let fifo_level = this.r(R.GFLVL);
        /* If there's stuff in the FIFO, read it into our data block */
        if (fifo_level === 0) {
            return undefined;
        }

        this.i2c.writeTo(this.addr, R.GFIFO_U);
        const fifo_data = this.i2c.readFrom(this.addr, fifo_level * 4);
        return this.decodeGesture(fifo_data);
    }

    /** Given an array of UDLRUDLRUDLR... bytes, return a gesture as a string */
    private decodeGesture(data: Uint8Array): Gesture {
        const THRESH = 10;
        let a = 0;
        let b = data.length - 4;

        while (a < data.length &&
            !(data[a] > THRESH && data[a + 1] > THRESH && data[a + 2] > THRESH && data[a + 3] > THRESH)) {
            a += 4;
        }
        while (b >= 0 &&
            !(data[b] > THRESH && data[b + 1] > THRESH && data[b + 2] > THRESH && data[b + 3] > THRESH)) {
            b -= 4;
        }

        if (a > b) { // no data found
            return undefined;
        }

        const ud_ratio_first = ((data[a] - data[a + 1]) * 100) / (data[a] + data[a + 1]);
        const lr_ratio_first = ((data[a + 2] - data[a + 3]) * 100) / (data[a + 2] + data[a + 3]);
        const ud_ratio_last = ((data[b] - data[b + 1]) * 100) / (data[b] + data[b + 1]);
        const lr_ratio_last = ((data[b + 2] - data[b + 3]) * 100) / (data[b + 2] + data[b + 3]);

        const ud = ud_ratio_last - ud_ratio_first;
        const lr = lr_ratio_last - lr_ratio_first;

        if (Math.abs(ud) > Math.abs(lr)) {
            return (ud > 0) ? "up" : "down";
        } else {
            return (lr > 0) ? "left" : "right";
        }
    }

    /** return a reading from the proximity sensor, 0..255 */
    getProximity(): number {
        return this.r(R.PDATA);
    }

    /** red/green/blue/ambient returned as {r,g,b,a} in the range 0..65535 */
    getRGBA(): RGBA {
        return {
            r: this.r(R.RDATAL) | (this.r(R.RDATAH) << 8),
            g: this.r(R.GDATAL) | (this.r(R.GDATAH) << 8),
            b: this.r(R.BDATAL) | (this.r(R.BDATAH) << 8),
            a: this.r(R.CDATAL) | (this.r(R.CDATAH) << 8)
        };
    }
}

export function connect(i2c: I2C): APDS9960 {
    return new APDS9960(i2c);
}
