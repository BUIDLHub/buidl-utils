import * as yup from 'yup';
import {sleep, Logger} from './';

const schema = yup.object({
    name: yup.string().required("RetryContext missing name to indicate what context retries are happening in"),
    maxRetries: yup.number().required("RetryContext missing maxRetries setting"),
    retryNullResults: yup.bool(), //defaults to false
    pauseBetweenTries: yup.number() //defaults to 500ms
})

const log = new Logger({component: "RetryContext"});


/**
 * RetryContext class handles retrying a function call until results are provided. It can be
 * configured with max number of retry attempts, whether to retry if null results are returned
 * from function, and how long to pause between retries. It can also be given an optional
 * 'continuationFilter' function that will be called with errors and if that function
 * returns false, the retries will end immediately with the last error.
 */
export default class RetryContext {
    constructor(props) {
        schema.validateSync(props);
        this.name = props.name;
        this.maxRetries = props.maxRetries;
        this.retryNullResults = props.retryNullResults || false;
        this.pauseBetweenTries = props.pauseBetweenTries || 500;

        //optionally, a continuation function can be called to determine 
        //if we should keep going if an error occurs.
        this.continuationFilter = props.continuationFilter;

        [
            'invoke',
            '_invokeWithRetries'
        ].forEach(fn=>this[fn]=this[fn].bind(this));
    }

    /**
     * Invoke the given function with the args provided and callback with results. This 
     * will keep invoking with a pause between errors over maxRetries attempts.
     * 
     * @param {function to invoke} fn 
     * @param {callback with error or results (e, r)} cb 
     * @param  {fn args} args 
     */
    async invoke(fn, cb, ...args) {
       let ctx = {
           tries: 0,
           fn,
           args
       }
       try {
           let r = await this._invokeWithRetries(ctx);
           await cb(null, r);
       } catch (e) {
           return cb(e);
       }
    }


    //internal loop to keep retrying until results are retrieved.
    _invokeWithRetries(ctx) {
        return new Promise(async (done,err)=>{
            while(ctx.tries < this.maxRetries) {
                ++ctx.tries;
                try {
                    let r = await ctx.fn(...ctx.args);
                    if(!r && this.retryNullResults) {
                        log.debug("No result in retry context",this.name,"Pausing and trying again...");
                        await sleep(this.pauseBetweenTries);
                    } else {
                        return done(r);
                    }
                } catch (e) {
                    if(typeof this.continuationFilter === 'function') {
                        try {
                            let check = await this.continuationFilter(e);
                            if(typeof check !== 'undefined' && !check) {
                                return err(e);
                            }
                        } catch (e2) {
                            log.error("Problem querying continuation filter fn", e2);
                        }
                    }
                    log.debug("Getting error in retry context", this.name, e);
                    if(ctx.tries >= this.maxRetries) {
                        log.error("Giving up invoking fn in retry context", this.name, e);
                        return err(e);
                    }
                    await sleep(this.pauseBetweenTries);
                }
            }
            err(new Error("Could not complete retry context", this.name,"after", this.maxRetries,"tries"))
        })
    }

    
}