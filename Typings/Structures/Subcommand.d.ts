/** @format */
import * as Discord from "discord.js";
import { Client } from "./Client";
declare type Perm = Discord.PermissionString | Discord.Permissions | string;
declare type Permission = Perm | Perm[];
interface SubcommandOptions {
    name: string;
    description?: string;
    aliases: string[];
    permissions: Permission[];
    parent: string;
}
declare type CommandFunction = (message: Discord.Message, args: string[], client: Client, ...extra: any[]) => any;
export declare class Subcommand implements SubcommandOptions {
    name: string;
    description?: string;
    aliases: string[];
    permissions: Permission[];
    parent: string;
    run: CommandFunction;
    constructor(options: SubcommandOptions, runFunction: CommandFunction);
}
export {};
