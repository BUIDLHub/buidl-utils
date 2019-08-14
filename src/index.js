import {default as Logger} from './Logger';
import {default as RetryContext} from './RetryContext';

const sleep = ms => {
    return new Promise(done=>{
        setTimeout(done, ms);
    })
}

export {
    Logger,
    RetryContext,
    sleep
}