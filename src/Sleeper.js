export default function(ms) {
    return new Promise(done=>{
        setTimeout(done, ms);
    })
}