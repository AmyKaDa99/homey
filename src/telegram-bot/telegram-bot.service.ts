import { Injectable, Logger } from '@nestjs/common';
import { Aminah_Id, TELEGRAM_TOKEN } from './telegram-constant';
const TelegramBot = require('node-telegram-bot-api');


@Injectable()
export class TelegramBotService {
    private readonly bot: any;
    private logger = new Logger(TelegramBotService.name);

    constructor(){
        this.bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});
        this.bot.on('message', this.onRecieveMessage)
  }

    onRecieveMessage = (msg: any)=>{
        this.logger.debug(msg)
        this.sendMessageToUser(Aminah_Id, 'homey is coming! 💕')    
    }

    sendMessageToUser = (userId:string, message:string)=>{
        this.bot.sendMessage(userId, message )
    }
}
