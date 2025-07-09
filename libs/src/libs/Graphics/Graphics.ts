import { I2C } from "i2c";

export interface Font {
    readonly charWidth: number;
    readonly charHeight: number;
    readonly firstCharCode: number;
    readonly lastCharCode: number;
    readonly data: Uint8Array;
}

export abstract class DisplayDriver {
    protected i2c: I2C;
    protected address: number;
    public readonly width: number;
    public readonly height: number;
    protected readonly pages: number;
    protected buffer: Uint8Array;
    protected font: Font | undefined;
    private _loggingEnabled: boolean = false;

    constructor(i2c: I2C, address: number, width: number, height: number) {
        this.i2c = i2c;
        this.address = address;
        this.width = width;
        this.height = height;

        if (height % 8 !== 0) {
            this._log("Display height not multiple of 8.");
        }
        this.pages = Math.ceil(height / 8);
        this.buffer = new Uint8Array(width * this.pages);
    }

    private _log(message: string): void {
        if (this._loggingEnabled) {
            console.log(`[DisplayDriver]: ${message}`);
        }
    }

    public setLogging(enabled: boolean): void {
        this._loggingEnabled = enabled;
    }

    // Abstract methods to be implemented by specific drivers
    abstract init(): void;
    protected abstract sendCommand(cmd: number, params?: Uint8Array | number[]): void;
    protected abstract sendData(data: Uint8Array): void;
    abstract display(): void;

    // Common methods
    getWidth(): number {
        return this.width;
    }

    getHeight(): number {
        return this.height;
    }

    clear(): void {
        this.buffer.fill(0);
    }

    drawPixel(x: number, y: number, color: boolean = true): void {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        const page = Math.floor(y / 8);
        const bitPosition = y % 8;
        const bufferIndex = x + page * this.width;

        if (bufferIndex >= 0 && bufferIndex < this.buffer.length) {
            if (color) {
                this.buffer[bufferIndex] |= (1 << bitPosition);
            } else {
                this.buffer[bufferIndex] &= ~(1 << bitPosition);
            }
        }
    }

    setFont(font: Font): void {
        this.font = font;
    }

    drawChar(x: number, y: number, char: string, color: boolean = true): void {
        if (!this.font) {
            this._log("Font not set.");
            return;
        }
        this._log(`drawChar: '${char}'`);

        if (char.length !== 1) {
            this._log(`drawChar: Expected single char, got '${char}'.`);
            return;
        }

        const charCode = char.charCodeAt(0);
        this._log(`drawChar: code=${charCode}`);

        if (isNaN(charCode) || charCode < this.font.firstCharCode || charCode > this.font.lastCharCode) {
            this._log(`drawChar: Char '${char}' out of font range.`);
            return;
        }

        const charIndexInFontData = (charCode - this.font.firstCharCode) * this.font.charWidth;
        this._log(`drawChar: font index=${charIndexInFontData}`);

        if (isNaN(charIndexInFontData) || charIndexInFontData < 0 || (charIndexInFontData + this.font.charWidth) > this.font.data.length) {
            this._log(`drawChar: Font index out of bounds for '${char}'.`);
            return;
        }

        for (let colOffset = 0; colOffset < this.font.charWidth; colOffset++) {
            const fontByte = this.font.data[charIndexInFontData + colOffset];
            for (let rowOffset = 0; rowOffset < this.font.charHeight; rowOffset++) {
                const currentX = x + colOffset;
                const currentY = y + rowOffset;

                if (currentX >= 0 && currentX < this.width && currentY >= 0 && currentY < this.height && ((fontByte >> rowOffset) & 0x01)) {
                    this.drawPixel(currentX, currentY, color);
                }
            }
        }
    }

    drawText(x: number, y: number, text: string, color: boolean = true, spacing: number = 1): void {
        if (!this.font) {
            this._log("Font not set.");
            return;
        }
        this._log(`drawText: "${text}"`);

        let currentX = x;
        // Using a traditional for loop for potentially more robust iteration
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            this._log(`drawText: Char '${char}', x=${currentX}`);

            this.drawChar(currentX, y, char, color);

            // Ensure font is still set (it shouldn't change, but good for sanity check)
            if (!this.font) {
                this._log("drawText: Font unset during loop.");
                return;
            }

            const nextX = currentX + this.font.charWidth + spacing;
            this._log(`drawText: Next X: ${nextX}`);
            currentX = nextX;

            if (currentX >= this.width) {
                this._log(`drawText: Text overflow.`);
                break;
            }
        }
        this._log(`drawText: Finished "${text}"`);
    }

    setContrast(contrast: number): void {
        this._log(`setContrast(${contrast}) not implemented.`);
    }

    on(): void {
        this._log("on() not implemented.");
    }

    off(): void {
        this._log("off() not implemented.");
    }

    drawLine(x1: number, y1: number, x2: number, y2: number, color: boolean = true): void {
        let dx = Math.abs(x2 - x1);
        let dy = Math.abs(y2 - y1);
        let sx = (x1 < x2) ? 1 : -1;
        let sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.drawPixel(x1, y1, color);

            if ((x1 === x2) && (y1 === y2)) { break; }
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x1 += sx; }
            if (e2 < dx) { err += dx; y1 += sy; }
        }
    }

    drawRectangle(x: number, y: number, width: number, height: number, color: boolean = true): void {
        this.drawLine(x, y, x + width - 1, y, color);
        this.drawLine(x, y + height - 1, x + width - 1, y + height - 1, color);
        this.drawLine(x, y, x, y + height - 1, color);
        this.drawLine(x + width - 1, y, x + width - 1, y + height - 1, color);
    }

    fillRectangle(x: number, y: number, width: number, height: number, color: boolean = true): void {
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                this.drawPixel(x + j, y + i, color);
            }
        }
    }

    drawCircle(x0: number, y0: number, radius: number, color: boolean = true): void {
        let x = radius;
        let y = 0;
        let err = 0;

        while (x >= y) {
            this.drawPixel(x0 + x, y0 + y, color);
            this.drawPixel(x0 + y, y0 + x, color);
            this.drawPixel(x0 - y, y0 + x, color);
            this.drawPixel(x0 - x, y0 + y, color);
            this.drawPixel(x0 - x, y0 - y, color);
            this.drawPixel(x0 - y, y0 - x, color);
            this.drawPixel(x0 + y, y0 - x, color);
            this.drawPixel(x0 + x, y0 - y, color);

            if (err <= 0) {
                y += 1;
                err += 2 * y + 1;
            }
            if (err > 0) {
                x -= 1;
                err -= 2 * x + 1;
            }
        }
    }

    fillCircle(x0: number, y0: number, radius: number, color: boolean = true): void {
        // Using horizontal lines to fill the circle
        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                if (x * x + y * y <= radius * radius) {
                    this.drawPixel(x0 + x, y0 + y, color);
                }
            }
        }
    }
}
