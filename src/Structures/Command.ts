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

import * as Discord from "discord.js";
import { Client } from "./Client";

type Perm = Discord.PermissionString | Discord.Permissions | string;

type Permission = Perm | Perm[];

type ArgumentType =
	| "string"
	| "mstring"
	| "char"
	| "number"
	| "int"
	| "float"
	| "boolean"
	| "color"
	| "guild"
	| "member"
	| "user"
	| "channel"
	| "message"
	| "invite"
	| "emoji"
	| "role"
	| "permission"
	| "time"
	| "command";

type Argument = {
	name: string;
	description: string;
	required: boolean;
	type: ArgumentType;
};

type CommandType = "BOTH" | "TEXT" | "SLASH";

interface CommandOptions {
	name: string;
	description?: string;
	aliases: string[];
	permissions: Permission[];
	type: CommandType;
	category?: string;
	usage?: string;
	args?: Argument[];
	slashCommandOptions?: Discord.ApplicationCommandOption[];
}

type CommandFunction = (
	message: Discord.Message,
	args: string[],
	client: Client,
	...extra: any[]
) => any;

export class Command implements CommandOptions {
	public name: string;
	public description: string;
	public aliases: string[];
	public permissions: Permission[];
	public type: CommandType;
	public category: string;
	public usage?: string;
	public args: Argument[];
	public slashCommandOptions?: Discord.ApplicationCommandOption[];
	public run: CommandFunction;

	constructor(options: CommandOptions, runFunction: CommandFunction) {
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

	public isSlash() {
		return ["BOTH", "SLASH"].includes(this.type);
	}

	public isText() {
		return ["BOTH", "TEXT"].includes(this.type);
	}

	public isBoth() {
		return this.type == "BOTH";
	}
}
