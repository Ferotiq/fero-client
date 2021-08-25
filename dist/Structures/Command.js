/**
 * MIT License
 *
 * Copyright (c) 2021 Ferotiq
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @format
 */
export class Command {
    name;
    description;
    aliases;
    permissions;
    type;
    category;
    usage;
    args;
    slashCommandOptions;
    run;
    constructor(options, runFunction) {
        this.name = options.name;
        this.description = options.description || "";
        this.aliases = options.aliases;
        this.permissions = options.permissions;
        this.type = options.type;
        this.args = options.args || [];
        this.category = options.category || "other";
        this.usage = options.usage;
        this.slashCommandOptions = options.slashCommandOptions;
        this.run = runFunction;
    }
    isSlash() {
        return ["BOTH", "SLASH"].includes(this.type);
    }
    isText() {
        return ["BOTH", "TEXT"].includes(this.type);
    }
    isBoth() {
        return this.type == "BOTH";
    }
}
