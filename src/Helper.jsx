
export function getlocalStorage_rememberme(){
    
    let rememberme=JSON.parse(localStorage.getItem("rememberme"));
    if(rememberme!=null){
        if(rememberme.time>new Date().getTime()){
            return rememberme
        }
        else{
            localStorage.removeItem("rememberme")
            return null;
        }
        
      }
    
    return null;
}
export function CheckToken() {
 try {
    const tokenExpireString = getCookie("expires");
    if (!tokenExpireString) return false;

    const tokenExpireTime = parseInt(tokenExpireString, 10);
    const currentTime = new Date().getTime();

    return tokenExpireTime > currentTime;
  } catch (error) {
    return false;
  }
}