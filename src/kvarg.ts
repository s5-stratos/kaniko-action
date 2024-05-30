import * as core from '@actions/core';

const ghActionCoreHandler: ErrorHandler = (msg: string): never => {
    core.setFailed(msg);
    throw new Error('multiline kv parse failed');
}

export const multilineKV = (input: string): Array<[string, string]> => {
    if (input.trim() === "") {
        return []
    }
    return new Scanner(input, ghActionCoreHandler).readKVs();
}

export type ErrorHandler = (msg: string) => never;

export class Scanner {
    private offset: number;
    private readonly results: Array<[string, string]>;
    constructor(private readonly input: string, private readonly onError: ErrorHandler) {
        this.offset = 0;
        this.results = [];
    }

    readKVs(): Array<[string, string]> {
        let kv = this.readKV();
        while (kv !== undefined) {
            this.results.push(kv);
            kv = this.readKV();
        }
        return this.results;
    }

    private readKV(): [string, string] | undefined {
        this.eatSpaces();
        if (this.input.length === this.offset) {
            return undefined;
        }
        if (this.input[this.offset] === '"') {
            this.offset++;
            const key = this.readQuotedKey();
            const value = this.readQuotedValue();
            this.expectNewline();
            return [key, value];
        } else {
            const key = this.readBareKey();
            const value = this.readBareValue();
            return [key, value];
        }
    }

    private readQuotedKey(): string {
        const start = this.offset;
        while (this.offset < this.input.length) {
            if (this.input[this.offset] === '=') {
                const key = this.input.slice(start, this.offset);
                this.offset++; // eat the =
                return key.replaceAll('""', '"');
            }
            // The quoted block ends early, so do something with it
            if (this.input[this.offset] === '"' && this.input[this.offset + 1] !== '"') {
                const key = this.input.slice(start, this.offset)
                this.offset++;
                return key.replaceAll('""', '"');
            }
            // Make sure we skip over the quote
            if (this.input[this.offset] === '"' && this.input[this.offset + 1] === '"') {
                this.offset++;
            }
            this.offset++;
        }
        this.onError('invalid key value string, missing =');
    }

    private readQuotedValue(): string {
        const start = this.offset;
        while (this.offset < this.input.length) {
            if (this.input[this.offset] === '"' && this.input[this.offset + 1] !== '"') {
                const value = this.input.slice(start, this.offset);
                this.offset++;
                return value.replaceAll('""', '"');
            }
            // Make sure we skip over the quote
            if (this.input[this.offset] === '"' && this.input[this.offset + 1] === '"') {
                this.offset++;
            }
            this.offset++;
        }
        this.onError('invalid key value string, missing ending quote');
    }

    private expectNewline() {
        if (this.offset === this.input.length) {
            return;
        }
        if (this.input[this.offset] !== '\n') {
            this.onError('invalid key value string, missing \\n after quoted line')
        }
        this.offset++;
    }

    private readBareKey(): string {
        const start = this.offset;
        while (this.offset < this.input.length) {
            if (this.input[this.offset] === '=') {
                const key = this.input.slice(start, this.offset);
                this.offset++;
                return key;
            }
            this.offset++;
        }
        this.onError('invalid key value string, missing =');
    }

    private readBareValue(): string {
        const start = this.offset;
        while (this.offset < this.input.length) {
            if (this.input[this.offset] === '\n') {
                const value = this.input.slice(start, this.offset);
                this.offset++;
                return value;
            }
            this.offset++;
        }
        // We hit the end of the string, so just return everything
        return this.input.slice(start);
    }

    private eatSpaces() {
        while (this.offset < this.input.length && ' \t\n\r'.indexOf(this.input[this.offset]) >= 0) {
            this.offset++;
        }
    }
}