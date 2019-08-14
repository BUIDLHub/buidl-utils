import Retry from './RetryContext';

describe("RetryContext", ()=>{

    it("Should pass success through", done=>{
        let called = 0;
        let good = async () => {
            ++called;
            return "Good";
        }

        let ctx = new Retry({
            name: "Test Passing Fn",
            maxRetries: 3
        });
        ctx.invoke(good, async (e, r)=>{
            if(e) {
                return done(new Error("Did not expect error to be given back in the end"));
            }
            if(called !== 1) {
                return done(new Error("Expected fn to be called 1x before finish"));
            }
            done();
        });
    });
    
    it("Should retry failing fn", done=>{
        let called = 0;
        let failing = async () => {
            ++called;
            throw new Error("Simulated Error");
        }
        let ctx = new Retry({
            name: "Test Failing Fn",
            maxRetries: 3
        });
        ctx.invoke(failing, async (e, r)=>{
            if(!e) {
                return done(new Error("Expected error to be given back in the end"));
            }
            if(called !== 3) {
                return done(new Error("Expected failing fn to be called 3x before final failure"));
            }
            done();
        });
    });

    it("Should forward args to fn", done=>{
        let called = 0;
        let check = async (a1, a2, a3) => {
            
            if(a1 !== 'a1' || a2 !== 'a2' || a3 !== 'a3') {
                throw new Error("Invalid args given");
            }
            ++called;
            return a3;
        }
        let ctx = new Retry({
            name: "Test Fn Args",
            maxRetries: 3
        });
        ctx.invoke(check, async (e, r)=>{
            if(e) {
                return done(new Error("Did not expect error to be given back in the end"));
            }
            if(called !== 1) {
                return done(new Error("Expected fn to be called 1x before finish"));
            }
            if(r !== 'a3') {
                return done(new Error("Final result did not match expectation: " + r + " != 'a3'"))
            }
            done();
        }, "a1", "a2", "a3");
    });

    it("Should obey continuationFilter callback", done=>{
        let called = 0;
        let check = async () => {
            ++called;
            throw new Error("Simulation");
        }
        let ctx = new Retry({
            name: "Test Short Circuit",
            maxRetries: 3,
            continuationFilter: (e)=>false
        });

        ctx.invoke(check, async (e, r)=>{
            if(!e) {
                return done(new Error("Expected error to be returned immediately"));
            }
            if(called !== 1) {
                return done(new Error("Expected only to be called once before short circuiting error"));
            }
            done();
        });
    });
});