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
import * as fs from "fs";
import "colors";
import * as path from "path";
import { builtInHelpCommand } from "../Scripts/builtInHelpCommand.js";
import { FMS } from "fero-ms";
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
export class Client extends Discord.Client {
    console = new FDCConsole();
    commands = new Discord.Collection();
    commandCategories = new Array();
    discord = Discord;
    defaultPrefix;
    prefixes = new Discord.Collection();
    commandLoadedMessage;
    eventLoadedMessage;
    emitMessageOnInteraction;
    builtInHelpCommand;
    deleteUnusedSlashCommands;
    paths;
    modules;
    permissionData;
    constructors = {
        string: (client, string) => string,
        mstring: (client, string, m, rest) => string + " " + rest.join(" "),
        char: (client, string) => string?.substring(0, 1) ?? null,
        number: (client, string) => parseFloat(string),
        int: (client, string) => parseInt(string),
        float: (client, string) => parseFloat(string),
        boolean: (client, string) => string == null ? null : !falsy.includes(string),
        color: (client, color) => Discord.Util.resolveColor(color),
        guild: (client, string) => this.guilds.cache.get(string),
        member: resolveMember,
        user: resolveUser,
        channel: resolveChannel,
        message: resolveMessage,
        invite: resolveInvite,
        emoji: resolveEmoji,
        role: resolveRole,
        permission: resolvePermission,
        time: (string) => FMS(string, "ms"),
        command: resolveCommand
    };
    converterAlias = {
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
    constructor(paths, modules = {}) {
        const config = JSON.parse(fs.readFileSync(paths.config)?.toString());
        if (!config)
            throw new FDCError("You did not supply a valid config path!");
        super(config);
        this.defaultPrefix = config.prefix;
        if (!config.tokenName)
            throw new FDCError("A token name in the config.json was not provided.");
        if (!process.env[config.tokenName || "TOKEN"])
            throw new FDCError(`No .env ${config.tokenName} was provided.`);
        const { commandLoadedMessage, eventLoadedMessage, builtInHelpCommand, deleteUnusedSlashCommands } = config;
        this.commandLoadedMessage = commandLoadedMessage;
        this.eventLoadedMessage = eventLoadedMessage;
        this.builtInHelpCommand = builtInHelpCommand;
        this.deleteUnusedSlashCommands = deleteUnusedSlashCommands;
        this.paths = paths;
        this.modules = modules;
        if (!config.permissionData)
            throw new FDCError("Permission data in the config.json was not provided.");
        this.permissionData = config.permissionData;
        Object.entries(this.paths).forEach(p => {
            if (fs.existsSync(p[1]))
                return;
            else {
                fs.mkdirSync(p[1]);
                this.console.warn(`${p[0]} directory "${p[1]}" didn't exist, creating it...`);
            }
        });
        this.login(process.env[config.tokenName || "TOKEN"]);
        this.once("ready", async () => {
            this.console.log(`${this.user.username} is online!`.magenta);
            const result = await this.reload();
            this.console.log(result.blue);
        });
    }
    async reload() {
        console.time("Fero-DC Reload");
        this.commands.clear();
        const slashCommands = await this.application.commands.fetch();
        console.timeLog("Fero-DC Reload", "Fetching SlashCommands");
        const commands = (await Promise.all(fs
            .readdirSync(this.paths.commands)
            .filter(file => isJSOrDirectory(`file://${this.paths.commands}/${file}`))
            .map(async (folder) => {
            if (isJS(folder))
                return (await import(`file://${this.paths.commands}/${folder}`));
            else
                return await Promise.all(fs
                    .readdirSync(`file://${this.paths.commands}/${folder}`)
                    .filter(file => isJS(file))
                    .map(async (file) => (await import(`file://${this.paths.commands}/${file}`))));
        })))
            .flat(1)
            .map(cmd => cmd?.command ?? cmd);
        commands.forEach(cmd => {
            if (!this.commandCategories.includes(cmd.category))
                this.commandCategories.push(cmd.category);
            this.commands.set(cmd.name, cmd);
            const slashCommand = slashCommands.find(c => c.name.toLowerCase() == cmd.name.toLowerCase());
            if (cmd.isSlash() && !slashCommand) {
                this.application.commands.create({
                    name: cmd.name,
                    description: cmd.description,
                    type: "CHAT_INPUT",
                    options: cmd.slashCommandOptions,
                    defaultPermission: true
                });
                this.console.warn(`Command ${cmd.name} isn't registered as a slash command, creating it...`);
            }
            else if (cmd.isSlash() && slashCommand) {
                if (!(cmd.description == slashCommand.description &&
                    arrayEquals(cmd.slashCommandOptions, slashCommand.options))) {
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
            if (this.commands.find(cmd => cmd.name.toLowerCase() == helpCommand.name ||
                cmd.aliases.map(lower).includes(helpCommand.name)))
                throw new FDCError("You are attempting to override a custom help command with the default help command, please choose one or the other.");
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
        console.timeLog("Fero-DC Reload", "Commands and Editing/Deleting SlashCommands");
        slashCommands.forEach(slashCommand => {
            const cmd = commands.find(cmd => cmd.name.toLowerCase() == slashCommand.name.toLowerCase() &&
                cmd.isSlash());
            if (!cmd &&
                this.deleteUnusedSlashCommands &&
                !(cmd.name == "help" && this.builtInHelpCommand))
                slashCommand.delete() &&
                    this.console.warn(`Deleted slash command ${slashCommand.name}...`);
        });
        console.timeLog("Fero-DC Reload", "Creating SlashCommands");
        const events = (await Promise.all(fs
            .readdirSync(this.paths.events)
            .filter(file => isJSOrDirectory(`file://${this.paths.events}/${file}`))
            .map(async (folder) => {
            if (isJS(folder))
                return (await import(`file://${this.paths.events}/${folder}`));
            else
                return await Promise.all(fs
                    .readdirSync(`file://${this.paths.events}/${folder}`)
                    .filter(file => isJS(`file://${this.paths.events}/${folder}/${file}`))
                    .map(async (file) => (await import(`file://${this.paths.events}/${folder}/${file}`))));
        })))
            .flat(1)
            .map(event => event?.event ??
            event);
        this.removeAllListeners();
        events.forEach(event => this.on(event.event, event.run.bind(null, this)));
        console.timeLog("Fero-DC Reload", "Events");
        console.table(Object.fromEntries(commands.map(cmd => [cmd.name, cmd])), [
            "description",
            "aliases",
            "permissions",
            "category",
            "type",
            "args",
            "slashCommandOptions"
        ]);
        console.table(Object.fromEntries(events.map(event => [event.event, event])), ["run"]);
        console.timeEnd("Fero-DC Reload");
        return `Reloaded ${commands.length} commands, ${events.length} events, and ${Object.keys(this.modules).length} modules.`;
    }
    checkPermissions(permissions, member) {
        if (!member || !(member instanceof Discord.GuildMember))
            return false;
        return permissions.some(permission => {
            if (typeof permission == "string")
                return this.checkPermission(permission, member);
            else if (permission instanceof Array)
                return permission.every(perm => this.checkPermission(perm, member));
        });
    }
    checkPermission(permission, member) {
        if (this.users.cache.get(permission))
            return member.id == permission;
        else if (member.guild.roles.cache.get(permission))
            return member.roles.cache.has(permission);
        else if (this.permissionData[permission])
            return this.checkPermissions(this.permissionData[permission], member);
        else
            return member.permissions.has(permission, true);
    }
    async runCommand(command, message, args) {
        const conversions = (await Promise.all(command.args.map(async (argument, index) => await this.constructors[argument.type](this, args[index], message, args.slice(index + 1))))) || [];
        return command.run(message, args, this, ...conversions);
    }
    getParameters(command) {
        return command.args;
    }
    getCommandsFromCategory(category) {
        return this.commands.filter(command => command.category == category);
    }
    getCommandUsage(command, guild = null) {
        if (!command)
            return;
        const prefix = this.prefix(guild);
        const cmdArgs = command.args
            .map(commandArg => `<${commandArg.name}${commandArg.required ?? true ? "" : "?"}>`)
            .join(" ");
        return (command.usage ||
            `${prefix}${command.name}${cmdArgs == "" ? "" : " " + cmdArgs}`);
    }
    prefix(guild = null) {
        return guild
            ? typeof guild == "string"
                ? this.prefixes.get(guild) || this.defaultPrefix
                : this.prefixes.get(guild.id) || this.defaultPrefix
            : this.defaultPrefix;
    }
    loadPrefixes(...iterators) {
        iterators.forEach(iterator => {
            if (iterator instanceof Discord.Collection) {
                iterator.forEach((v, k) => {
                    if (typeof v != "string")
                        return;
                    if (typeof k != "string" && !(k instanceof Discord.Guild))
                        return;
                    if (k instanceof Discord.Guild)
                        this.prefixes.set(k.id, v);
                    else
                        this.prefixes.set(k, v);
                });
            }
            else if (iterator instanceof Array) {
                iterator.forEach(i => {
                    const [k, v] = i;
                    if (typeof v != "string")
                        return;
                    if (typeof k != "string" && !(k instanceof Discord.Guild))
                        return;
                    if (k instanceof Discord.Guild)
                        this.prefixes.set(k.id, v);
                    else
                        this.prefixes.set(k, v);
                });
            }
            else if (iterator instanceof Map) {
                iterator.forEach((v, k) => {
                    if (typeof v != "string")
                        return;
                    if (typeof k != "string" && !(k instanceof Discord.Guild))
                        return;
                    if (k instanceof Discord.Guild)
                        this.prefixes.set(k.id, v);
                    else
                        this.prefixes.set(k, v);
                });
            }
            else if (typeof iterator == "object") {
                Object.entries(iterator).forEach(i => {
                    const [k, v] = i;
                    if (typeof v != "string" || typeof k != "string")
                        return;
                    this.prefixes.set(k, v);
                });
            }
            else
                throw new FDCError("loadPrefixes was not passed an object, array, map, or collection.");
        });
        return this.prefixes;
    }
}
function isJS(fileName) {
    return [".js", ".ts"].includes(path.extname(fileName));
}
function isDirectory(filePath) {
    return fs.lstatSync(filePath).isDirectory();
}
function isJSOrDirectory(filePath) {
    return isJS(filePath) || isDirectory(filePath);
}
function arrayEquals(a, b) {
    return a.every((val, index) => val === b[index]);
}
function resolveUser(client, string, message, rest) {
    const user = client.users.cache.find(u => u.id == string ||
        u.tag == string ||
        `<@!${u.id}>` == string ||
        `<@${u.id}>` == string);
    return user ? user : null;
}
async function resolveMember(client, string, message, rest) {
    return await message.guild.members.fetch(resolveUser(client, string, message, rest).id);
}
function resolveChannel(client, string, message, rest) {
    const channel = client.channels.cache.find(c => c.id == string || `<#!${c.id}>` == string || `<#${c.id}>` == string);
    return channel ? channel : null;
}
async function resolveMessage(client, string, message, rest) {
    const msg = message.channel.messages.cache.find(m => m.id == string || m.url == string);
    const msg2 = await message.channel.messages.fetch(string, {
        cache: true,
        force: true
    });
    return msg ? msg : msg2 ? msg2 : null;
}
async function resolveInvite(client, string, message, rest) {
    const invite = message.guild.invites.cache.find(e => e.code == string || e.url == string);
    const invite2 = await message.guild.invites.fetch({
        code: string,
        force: true,
        cache: true
    });
    return invite ? invite : invite2 ? invite2 : null;
}
function resolveEmoji(client, string, message, rest) {
    const emoji = client.emojis.cache.find(e => e.id == string || e.name == string || e.url == string);
    return emoji ? emoji : null;
}
function resolveRole(client, string, message, rest) {
    const role = message.guild.roles.cache.find(r => r.id == string || r.name == string);
    return role ? role : null;
}
function resolvePermission(client, string, message, rest) {
    if (!Object.keys(Discord.Permissions.FLAGS).includes(string.toUpperCase()))
        return null;
    return string.toUpperCase();
}
function resolveCommand(client, string, message, rest) {
    return client.commands.find(cmd => cmd.name.toLowerCase() == string.toLowerCase() ||
        cmd.aliases.map(lower).includes(string.toLowerCase()));
}
function lower(s) {
    return s.toLowerCase();
}
