import { IAppAccessors, IConfigurationExtend, IConfigurationModify, IEnvironmentRead, IHttp, ILogger, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { ISetting } from '@rocket.chat/apps-engine/definition/settings';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { Whosout } from './actions/Whosout';
import { ZohoCommand } from './commands/ZohoCommand';
import { WhosOutEndpoint } from './endpoints/WhosOut';
import { AppSetting, settings } from './settings';

export class ZohoApp extends App {

    /**
     * The bot username alias
     */
    public zohoName: string = 'Zorro';

    /**
     * The bot avatar
     */
    public zohoEmojiAvatar: string = ':fox:';

    /**
     * The bot username who sends the messages
     */
    public botUsername: string;

    /**
     * The bot user sending messages
     */
    public botUser: IUser;

    /**
     * The zoho people token, from settings
     */
    public peopleToken: string;

    /**
     * The room name where to get members from
     */
    public whosoutRoomName: string;

    /**
     * The actual room object where to get members from
     */
    public whosoutRoom: IRoom;

    /**
     * The whosout mechanism
     */
    public readonly whosout: Whosout;

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
        this.whosout = new Whosout(this);
    }

    /**
     * Loads the room where to get members from
     * Loads the room where to post messages to
     * Loads the user who'll be posting messages as the botUser
     *
     * @param environmentRead
     * @param configModify
     */
    public async onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): Promise<boolean> {
        this.botUsername = await environmentRead.getSettings().getValueById(AppSetting.BotUsername);
        if (this.botUsername) {
            this.botUser = await this.getAccessors().reader.getUserReader().getByUsername(this.botUsername) as IUser;
        } else {
            return false;
        }

        this.peopleToken = await environmentRead.getSettings().getValueById(AppSetting.PeopleToken);

        this.whosoutRoomName = await environmentRead.getSettings().getValueById(AppSetting.WhosoutRoom);
        if (this.whosoutRoomName) {
            this.whosoutRoom = await this.getAccessors().reader.getRoomReader().getByName(this.whosoutRoomName) as IRoom;
        } else {
            return false;
        }

        return true;
    }

    /**
     * Updates room ids for members and messages when settings are updated
     *
     * @param setting
     * @param configModify
     * @param read
     * @param http
     */
    public async onSettingUpdated(setting: ISetting, configModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        switch (setting.id) {
            case AppSetting.BotUsername:
                this.botUsername = setting.value;
                if (this.botUsername) {
                    this.botUser = await this.getAccessors().reader.getUserReader().getByUsername(this.botUsername) as IUser;
                }
                break;
            case AppSetting.PeopleToken:
                this.peopleToken = setting.value;
                break;
            case AppSetting.WhosoutRoom:
                this.whosoutRoomName = setting.value;
                if (this.whosoutRoomName) {
                    this.whosoutRoom = await this.getAccessors().reader.getRoomReader().getByName(this.whosoutRoomName) as IRoom;
                }
                break;
        }
    }

    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await Promise.all(settings.map((setting) => configuration.settings.provideSetting(setting)));

        // API endpoints
        await configuration.api.provideApi({
            visibility: ApiVisibility.PRIVATE,
            security: ApiSecurity.UNSECURE,
            endpoints: [
                new WhosOutEndpoint(this),
            ],
        });

        // Slash Commands
        await configuration.slashCommands.provideSlashCommand(new ZohoCommand(this));
    }
}