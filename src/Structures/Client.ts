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
import * as dotenv from "dotenv";
dotenv.config();
import { FDCConsole, FDCError } from "./FDCConsole.js";
import { Command } from "./Command.js";
import { Event } from "./Event.js";
import * as fs from "fs";
import "colors";
import * as path from "path";
import { builtInHelpCommand } from "../Scripts/builtInHelpCommand.js";
import { FMS } from "fero-ms";

interface HelpCommandStyle extends Discord.MessageEmbedOptions {
	slashCommand: boolean;
}

interface ClientOptions extends Discord.ClientOptions {
	tokenName: string;
	prefix: string;
	commandLoadedMessage?: boolean;
	eventLoadedMessage?: boolean;
	builtInHelpCommand?: HelpCommandStyle;
	deleteUnusedSlashCommands?: boolean;
	permissionData?: object;
}

interface Paths {
	config: string;
	commands: string;
	events: string;
}

const falsy = [
	"false",
	"0",
	"0n",
	"undefined",
	"NaN",
	"",
	"no",
	"off",
	undefined
];

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

type Perm = Discord.PermissionString | Discord.Permissions | string;

type Permission = Perm | Perm[];

interface CommandImport extends Command {
	command: Command;
}

interface EventImport {
	event: Event<keyof Discord.ClientEvents>;
}

type PrefixCollection =
	| Discord.Collection<string | Discord.Guild, string>
	| [string | Discord.Guild, string][]
	| Map<string | Discord.Guild, string>;

export class Client extends Discord.Client {
	private console = new FDCConsole();
	public commands = new Discord.Collection<string, Command>();
	public commandCategories = new Array<string>();
	public discord = Discord;
	public defaultPrefix: string;
	public prefixes = new Discord.Collection<string, string>();
	public commandLoadedMessage: boolean;
	public eventLoadedMessage: boolean;
	public emitMessageOnInteraction: boolean;
	public builtInHelpCommand: HelpCommandStyle;
	public deleteUnusedSlashCommands: boolean;
	public paths: Paths;
	public modules: object;
	public permissionData: object;
	private constructors = {
		string: (client: Client, string: string) => string,
		mstring: (client: Client, string: string, m, rest: string[]) =>
			string + " " + rest.join(" "),
		char: (client: Client, string: string) =>
			string?.substring(0, 1) ?? null,
		number: (client: Client, string: string) => parseFloat(string),
		int: (client: Client, string: string) => parseInt(string),
		float: (client: Client, string: string) => parseFloat(string),
		boolean: (client: Client, string: string) =>
			string == null ? null : !falsy.includes(string),
		color: (client: Client, color: Discord.ColorResolvable) =>
			Discord.Util.resolveColor(color),
		guild: (client: Client, string: string) =>
			this.guilds.cache.get(string),
		member: resolveMember,
		user: resolveUser,
		channel: resolveChannel,
		message: resolveMessage,
		invite: resolveInvite,
		emoji: resolveEmoji,
		role: resolveRole,
		permission: resolvePermission,
		time: (string: string) => FMS(string, "ms"),
		command: resolveCommand
	};
	public converterAlias = {
		string: "string",
		mstring: "string",
		char: "character",
		number: "number",
		int: "integer (whole number)",
		float: "floating-point number",
		boolean: "true/false",
		color: "hexadecimal color",
		guild: "server",
		member: "server member",
		user: "discord user",
		channel: "channel",
		message: "message",
		invite: "server invite",
		emoji: "emoji",
		role: "server role",
		permission: "permission string",
		time: "date",
		command: "fero-dc command"
	};

	public constructor(paths: Paths, modules: object = {}) {
		const config = JSON.parse(
			fs.readFileSync(paths.config)?.toString()
		) as ClientOptions;
		if (!config)
			throw new FDCError("You did not supply a valid config path!");
		super(config);

		this.defaultPrefix = config.prefix;

		if (!config.tokenName)
			throw new FDCError(
				"A token name in the config.json was not provided."
			);

		if (!process.env[config.tokenName || "TOKEN"])
			throw new FDCError(`No .env ${config.tokenName} was provided.`);

		const {
			commandLoadedMessage,
			eventLoadedMessage,
			builtInHelpCommand,
			deleteUnusedSlashCommands
		} = config;

		this.commandLoadedMessage = commandLoadedMessage;
		this.eventLoadedMessage = eventLoadedMessage;
		this.builtInHelpCommand = builtInHelpCommand;
		this.deleteUnusedSlashCommands = deleteUnusedSlashCommands;

		this.paths = paths;

		this.modules = modules;

		if (!config.permissionData)
			throw new FDCError(
				"Permission data in the config.json was not provided."
			);

		this.permissionData = config.permissionData;

		Object.entries(this.paths).forEach(p => {
			if (fs.existsSync(p[1])) return;
			else {
				fs.mkdirSync(p[1]);
				this.console.warn(
					`${p[0]} directory "${p[1]}" didn't exist, creating it...`
				);
			}
		});

		this.login(process.env[config.tokenName || "TOKEN"]);

		this.once("ready", async () => {
			this.console.log(`${this.user.username} is online!`.magenta);
			const result = await this.reload();
			this.console.log(result.blue);
		});
	}

	async reload(): Promise<string> {
		console.time("Fero-DC Reload");
		this.commands.clear();

		const slashCommands = await this.application.commands.fetch();

		console.timeLog("Fero-DC Reload", "Fetching SlashCommands");

		const commands = (
			await Promise.all(
				fs
					.readdirSync(this.paths.commands)
					.filter(file =>
						isJSOrDirectory(`file://${this.paths.commands}/${file}`)
					)
					.map(async folder => {
						if (isJS(folder))
							return (await import(
								`file://${this.paths.commands}/${folder}`
							)) as Command;
						else
							return await Promise.all(
								fs
									.readdirSync(
										`file://${this.paths.commands}/${folder}`
									)
									.filter(file => isJS(file))
									.map(
										async file =>
											(await import(
												`file://${this.paths.commands}/${file}`
											)) as Command | CommandImport
									)
							);
					})
			)
		)
			.flat(1)
			.map(cmd => (cmd as CommandImport)?.command ?? (cmd as Command));

		commands.forEach(cmd => {
			if (!this.commandCategories.includes(cmd.category))
				this.commandCategories.push(cmd.category);
			this.commands.set(cmd.name, cmd);
			const slashCommand = slashCommands.find(
				c => c.name.toLowerCase() == cmd.name.toLowerCase()
			);
			if (cmd.isSlash() && !slashCommand) {
				this.application.commands.create({
					name: cmd.name,
					description: cmd.description,
					type: "CHAT_INPUT",
					options: cmd.slashCommandOptions,
					defaultPermission: true
				});
				this.console.warn(
					`Command ${cmd.name} isn't registered as a slash command, creating it...`
				);
			} else if (cmd.isSlash() && slashCommand) {
				if (
					!(
						cmd.description == slashCommand.description &&
						arrayEquals(
							cmd.slashCommandOptions,
							slashCommand.options
						)
					)
				) {
					slashCommand.edit({
						name: cmd.name,
						description: cmd.description,
						type: "CHAT_INPUT",
						options: cmd.slashCommandOptions,
						defaultPermission: true
					});
					this.console.log(`Edited slash command ${cmd.name}...`);
				}
			}
		});

		if (this.builtInHelpCommand) {
			const helpCommand = builtInHelpCommand(this);

			if (
				this.commands.find(
					cmd =>
						cmd.name.toLowerCase() == helpCommand.name ||
						cmd.aliases.map(lower).includes(helpCommand.name)
				)
			)
				throw new FDCError(
					"You are attempting to override a custom help command with the default help command, please choose one or the other."
				);

			this.commands.set(helpCommand.name, helpCommand);

			if (helpCommand.isSlash() && !helpCommand.slashCommandOptions)
				this.application.commands.create({
					name: helpCommand.name,
					description: helpCommand.description,
					type: "CHAT_INPUT",
					options: helpCommand.slashCommandOptions,
					defaultPermission: true
				});
		}

		console.timeLog(
			"Fero-DC Reload",
			"Commands and Editing/Deleting SlashCommands"
		);

		slashCommands.forEach(slashCommand => {
			const cmd = commands.find(
				cmd =>
					cmd.name.toLowerCase() == slashCommand.name.toLowerCase() &&
					cmd.isSlash()
			);
			if (
				!cmd &&
				this.deleteUnusedSlashCommands &&
				!(cmd.name == "help" && this.builtInHelpCommand)
			)
				slashCommand.delete() &&
					this.console.warn(
						`Deleted slash command ${slashCommand.name}...`
					);
		});

		console.timeLog("Fero-DC Reload", "Creating SlashCommands");

		const events = (
			await Promise.all(
				fs
					.readdirSync(this.paths.events)
					.filter(file =>
						isJSOrDirectory(`file://${this.paths.events}/${file}`)
					)
					.map(async folder => {
						if (isJS(folder))
							return (await import(
								`file://${this.paths.events}/${folder}`
							)) as Event<keyof Discord.ClientEvents>;
						else
							return await Promise.all(
								fs
									.readdirSync(
										`file://${this.paths.events}/${folder}`
									)
									.filter(file =>
										isJS(
											`file://${this.paths.events}/${folder}/${file}`
										)
									)
									.map(
										async file =>
											(await import(
												`file://${this.paths.events}/${folder}/${file}`
											)) as
												| Event<
														keyof Discord.ClientEvents
												  >
												| EventImport
									)
							);
					})
			)
		)
			.flat(1)
			.map(
				event =>
					(event as EventImport)?.event ??
					(event as Event<keyof Discord.ClientEvents>)
			);

		this.removeAllListeners();

		events.forEach(event =>
			this.on(event.event, event.run.bind(null, this))
		);

		console.timeLog("Fero-DC Reload", "Events");

		console.table(
			Object.fromEntries(commands.map(cmd => [cmd.name, cmd])),
			[
				"description",
				"aliases",
				"permissions",
				"category",
				"type",
				"args",
				"slashCommandOptions"
			]
		);

		console.table(
			Object.fromEntries(events.map(event => [event.event, event])),
			["run"]
		);

		console.timeEnd("Fero-DC Reload");
		return `Reloaded ${commands.length} commands, ${
			events.length
		} events, and ${Object.keys(this.modules).length} modules.`;
	}

	public checkPermissions(
		permissions: Permission[],
		member: Discord.GuildMember
	): boolean {
		if (!member || !(member instanceof Discord.GuildMember)) return false;

		return permissions.some(permission => {
			if (typeof permission == "string")
				return this.checkPermission(permission, member);
			else if (permission instanceof Array)
				return permission.every(perm =>
					this.checkPermission(perm, member)
				);
		});
	}

	private checkPermission(
		permission: Permission,
		member: Discord.GuildMember
	): boolean {
		if (this.users.cache.get(permission as string))
			return member.id == permission;
		else if (member.guild.roles.cache.get(permission as string))
			return member.roles.cache.has(permission as string);
		else if (this.permissionData[permission as string])
			return this.checkPermissions(
				this.permissionData[permission as string],
				member
			);
		else
			return member.permissions.has(
				permission as Discord.PermissionResolvable,
				true
			);
	}

	public async runCommand(
		command: Command,
		message: Discord.Message,
		args: string[]
	): Promise<void> {
		const conversions =
			(await Promise.all(
				command.args.map(
					async (argument, index) =>
						await this.constructors[argument.type](
							this as any,
							args[index],
							message as any,
							args.slice(index + 1)
						)
				)
			)) || [];

		return command.run(message, args, this, ...conversions);
	}

	public getParameters(command: Command): Argument[] {
		return command.args;
	}

	public getCommandsFromCategory(category: string) {
		return this.commands.filter(command => command.category == category);
	}

	public getCommandUsage(command: Command, guild: Discord.Guild = null) {
		if (!command) return;
		const prefix = this.prefix(guild);

		const cmdArgs = command.args
			.map(
				commandArg =>
					`<${commandArg.name}${
						commandArg.required ?? true ? "" : "?"
					}>`
			)
			.join(" ");

		return (
			command.usage ||
			`${prefix}${command.name}${cmdArgs == "" ? "" : " " + cmdArgs}`
		);
	}

	public prefix(guild: Discord.Guild | string = null) {
		return guild
			? typeof guild == "string"
				? this.prefixes.get(guild) || this.defaultPrefix
				: this.prefixes.get(guild.id) || this.defaultPrefix
			: this.defaultPrefix;
	}

	public loadPrefixes(...iterators: PrefixCollection[]) {
		iterators.forEach(iterator => {
			if (iterator instanceof Discord.Collection) {
				iterator.forEach((v, k) => {
					if (typeof v != "string") return;
					if (typeof k != "string" && !(k instanceof Discord.Guild))
						return;
					if (k instanceof Discord.Guild) this.prefixes.set(k.id, v);
					else this.prefixes.set(k, v);
				});
			} else if (iterator instanceof Array) {
				iterator.forEach(i => {
					const [k, v] = i;
					if (typeof v != "string") return;

					if (typeof k != "string" && !(k instanceof Discord.Guild))
						return;
					if (k instanceof Discord.Guild) this.prefixes.set(k.id, v);
					else this.prefixes.set(k, v);
				});
			} else if (iterator instanceof Map) {
				iterator.forEach((v, k) => {
					if (typeof v != "string") return;
					if (typeof k != "string" && !(k instanceof Discord.Guild))
						return;
					if (k instanceof Discord.Guild) this.prefixes.set(k.id, v);
					else this.prefixes.set(k, v);
				});
			} else if (typeof iterator == "object") {
				Object.entries(iterator).forEach(i => {
					const [k, v] = i;
					if (typeof v != "string" || typeof k != "string") return;
					this.prefixes.set(k, v);
				});
			} else
				throw new FDCError(
					"loadPrefixes was not passed an object, array, map, or collection."
				);
		});

		return this.prefixes;
	}
}

function isJS(fileName: string): boolean {
	return [".js", ".ts"].includes(path.extname(fileName));
}

function isDirectory(filePath: string): boolean {
	return fs.lstatSync(filePath).isDirectory();
}

function isJSOrDirectory(filePath: string): boolean {
	return isJS(filePath) || isDirectory(filePath);
}

function arrayEquals<T>(a: Array<T>, b: Array<T>) {
	return a.every((val, index) => val === b[index]);
}

function resolveUser(
	client: Client,
	string: string,
	message: Discord.Message,
	rest: string[]
) {
	const user = client.users.cache.find(
		u =>
			u.id == string ||
			u.tag == string ||
			`<@!${u.id}>` == string ||
			`<@${u.id}>` == string
	);
	return user ? user : null;
}

async function resolveMember(
	client: Client,
	string: string,
	message: Discord.Message,
	rest: string[]
) {
	return await message.guild.members.fetch(
		resolveUser(client, string, message, rest).id
	);
}

function resolveChannel(
	client: Client,
	string: string,
	message: Discord.Message,
	rest: string[]
) {
	const channel = client.channels.cache.find(
		c => c.id == string || `<#!${c.id}>` == string || `<#${c.id}>` == string
	);
	return channel ? channel : null;
}

async function resolveMessage(
	client: Client,
	string: string,
	message: Discord.Message,
	rest: string[]
) {
	const msg = message.channel.messages.cache.find(
		m => m.id == string || m.url == string
	);

	const msg2 = await message.channel.messages.fetch(string, {
		cache: true,
		force: true
	});

	return msg ? msg : msg2 ? msg2 : null;
}

async function resolveInvite(
	client: Client,
	string: string,
	message: Discord.Message,
	rest: string[]
) {
	const invite = message.guild.invites.cache.find(
		e => e.code == string || e.url == string
	);

	const invite2 = await message.guild.invites.fetch({
		code: string,
		force: true,
		cache: true
	});

	return invite ? invite : invite2 ? invite2 : null;
}

function resolveEmoji(
	client: Client,
	string: string,
	message: Discord.Message,
	rest: string[]
) {
	const emoji = client.emojis.cache.find(
		e => e.id == string || e.name == string || e.url == string
	);
	return emoji ? emoji : null;
}

function resolveRole(
	client: Client,
	string: string,
	message: Discord.Message,
	rest: string[]
) {
	const role = message.guild.roles.cache.find(
		r => r.id == string || r.name == string
	);
	return role ? role : null;
}

function resolvePermission(
	client: Client,
	string: string,
	message: Discord.Message,
	rest: string[]
) {
	if (!Object.keys(Discord.Permissions.FLAGS).includes(string.toUpperCase()))
		return null;

	return string.toUpperCase();
}

function resolveCommand(
	client: Client,
	string: string,
	message: Discord.Message,
	rest: string[]
) {
	return client.commands.find(
		cmd =>
			cmd.name.toLowerCase() == string.toLowerCase() ||
			cmd.aliases.map(lower).includes(string.toLowerCase())
	);
}

function lower(s: string) {
	return s.toLowerCase();
}
