import { I2C } from "i2c";

const enum TSL2561_CONSTANTS {
    ADDR = 0x39, // Default I2C address
    REG_CONTROL = 0x00,
    REG_DATA0LOW = 0x0C,
    REG_DATA0HIGH = 0x0D,
    CMD = 0x80, // Command bit
    POWER_UP = 0x03,
    POWER_DOWN = 0x00,
    // Timing registers - not used in this basic implementation
    // REG_TIMING = 0x01,
    // REG_THRESHLOWLOW = 0x02,
    // REG_THRESHLOWHIGH = 0x03,
    // REG_THRESHHIGHLOW = 0x04,
    // REG_THRESHHIGHHIGH = 0x05,
    // REG_INTERRUPT = 0x06,
    // REG_ID = 0x0A
};

export class TSL2561 {
    private i2c: I2C;
    private address: number;

    constructor(i2c: I2C, address: number = TSL2561_CONSTANTS.ADDR) {
        this.i2c = i2c;
        this.address = address;
        this.init();
    }

    /** Initialize TSL2561 */
    private init() {
        // Power up the sensor
        this.write(TSL2561_CONSTANTS.CMD | TSL2561_CONSTANTS.REG_CONTROL, TSL2561_CONSTANTS.POWER_UP);
    }

    private read(reg: number, n: number): Uint8Array {
        this.i2c.writeTo(this.address, reg);
        return this.i2c.readFrom(this.address, n);
    }

    private write(reg: number, value: number) {
        this.i2c.writeTo(this.address, [reg, value]);
    }

    /**
     * Reads the luminosity from the TSL2561 sensor.
     * The raw value returned is a combination of broadband and infrared light.
     * For a more accurate lux value, further calculations based on the sensor's gain and integration time,
     * and potentially readings from both ADC channels (channel 0 for broadband, channel 1 for IR)
     * would be necessary. This basic implementation reads the raw value from channel 0.
     * @returns {number} The raw luminosity value.
     */
    readLuminosity(): number {
        const dataLow = this.read(TSL2561_CONSTANTS.CMD | TSL2561_CONSTANTS.REG_DATA0LOW, 1)[0];
        const dataHigh = this.read(TSL2561_CONSTANTS.CMD | TSL2561_CONSTANTS.REG_DATA0HIGH, 1)[0];
        return (dataHigh << 8) | dataLow;
    }

    /** Power down the TSL2561 sensor */
    powerDown() {
        this.write(TSL2561_CONSTANTS.CMD | TSL2561_CONSTANTS.REG_CONTROL, TSL2561_CONSTANTS.POWER_DOWN);
    }
}

export function connect(i2c: I2C, address?: number) {
    return new TSL2561(i2c, address);
};
