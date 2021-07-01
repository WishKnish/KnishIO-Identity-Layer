import e from"@wishknish/knishio-identity-layer/src/User";import t from"@wishknish/knishio-identity-layer/src/KnishIOVuexModel";import s from"@wishknish/knishio-identity-layer/src/UserWallets";import a from"vuex";import{getField as i,updateField as r}from"vuex-map-fields";import{generateSecret as o,generateBundleHash as l}from"@wishknish/knishio-client-js/src/libraries/crypto";import n from"dexie";import{Wallet as c}from"@wishknish/knishio-client-js";import u from"@wishknish/knishio-identity-layer/src/ModelEventListener";class h{constructor(e,t){this.init(e,t)}init(e,t,s){this.$__store=this.createStore(),this.initVuexModels(this.$__store,t,s)}createStore(t){t.use(a);let i={state:{},getters:{},mutations:{}};return e.fillVuexStorage(i),s.fillVuexStorage(i),new a.Store(i)}initVuexModels(a,i,r=!1){e.vuexModel=new t(a,e.vuexFields(),"user",i,r),s.vuexModel=new t(a,s.vuexFields(),"wallet",[],r)}}class _{static fillVuexStorage(e,t,s,a,o=[],l=[]){let n=e=>`${t}/${e}`;return s.forEach((e=>{o.push({name:`get_${e}`.toUpperCase(),fn:s=>s[t][e.toCamelCase()]}),l.push({name:`set_${e}`.toUpperCase(),fn:(s,a)=>{s[t][e.toCamelCase()]=a}})})),o.forEach((t=>{e.getters.hasOwnProperty(n(t.name))||(e.getters[n(t.name)]=t.fn)})),l.forEach((t=>{e.mutations.hasOwnProperty(n(t.name))||(e.mutations[n(t.name)]=t.fn)})),e.getters[n("getField")]=i,e.mutations[n("updateField")]=r,e.getters[n("GET_DEFAULT_STATE")]=()=>a,e.state[t]=a,e}constructor(e,t,s,a=[],i=!1){this.$__store=e,this.$__vuexFields=t,this.$__attributes=a,this.$__prefix=s||this.constructor.name.toSnakeCase(),this.$__logging=i}attributes(){return this.$__attributes}getComputed(){let e={};return this.$__vuexFields.concat(this.$__attributes).forEach((t=>{let s=this.$__vuexFields.includes(t)?t.toCamelCase():t;e[s]={get:()=>this.get(t),set:e=>{this.set(t,e)}}})),e}async setData(e,t){let s=`${this.$__prefix}_data`,a=this.get(s);a[e]=t,this.$__logging&&console.log(`------- setAttribute ${s}: ${e} = ${t}`),await this.setVuex(s,a)}getData(e){let t=`${this.$__prefix}_data`,s=this.get(t);if(!s)return this.$__logging&&console.warn(` ${this.constructor.name}.data is empty.`),null;if(!s.hasOwnProperty(e))return this.$__logging&&console.error(` ${this.constructor.name}.data[ ${e} ] does exists.`),null;let a=s[e];return this.$__logging&&console.log(`------- getAttribute ${t}: ${e} => ${a}`),a}async setVuex(e,t){this.$__logging&&console.log(`------- setVuex: ${this.$__prefix}/SET_${e.toUpperCase()} = ${t}`),await this.$__store.commit(`${this.$__prefix}/SET_${e.toUpperCase()}`,t)}getVuex(e){let t=this.$__store.getters[`${this.$__prefix}/getField`](`${this.$__prefix}.${e.toCamelCase()}`);return this.$__logging&&console.log(`------- getVuex: ${this.$__prefix}/GET_${e.toUpperCase()} - ${t}`),t}async getVuexAsync(e){let t=await this.$__store.getters[`${this.$__prefix}/GET_${e.toUpperCase()}`];return this.$__logging&&console.log(`------- getVuexAsync: ${this.$__prefix}/GET_${e.toUpperCase()} - ${t}`),t}async set(e,t){this.$__vuexFields.includes(e)?await this.setVuex(e,t):await this.setData(e,t)}get(e){return this.$__vuexFields.includes(e)?this.getVuex(e):this.getData(e)}}class g{static vuexFields(){return["wallets","shadow_wallets"]}static defaultState(){return{wallets:{},shadowWallets:{}}}static fillVuexStorage(e){let t=[{name:"RESET_STATE",fn:(e,t)=>{Object.keys(t).forEach((s=>{e.wallet[s]=t[s]}))}}];return _.fillVuexStorage(e,"wallet",g.vuexFields(),g.defaultState(),[],t)}constructor(e,t){this.$__storage=e,this.$__store=e.$__store,this.$__vm=t}async getWallets(e=null,t=!1){let s=await this.$__storage.getVuex(t?"shadow_wallets":"wallets");return e?s[e]:s}async getShadowWallets(e=null){return await this.getWallets(e,!0)}async init({secret:e,token:t,position:s=null}){const a=new c({secret:e,token:t,position:s});await this.setWallet(a)}async reset(){console.log("Wallet::reset() - Deleting wallet meta..."),this.$__store.commit(`${this.$__storage.$__prefix}/RESET_STATE`,g.defaultState())}async import(e){console.log(`Wallet::import() - Preparing to restore ${e.length} remote wallets...`),await this.reset(),e.forEach((e=>{e.balance=Number(e.balance),e.address?this.setWallet(e):this.setShadowWallet(e)})),console.log("Wallet::import() - All remote wallets restored...")}async setWallet(e){const t=await this.getWallets(e.token);!t||!e.createdAt||t.createdAt<=e.createdAt?(console.log(`Wallet::SET_WALLET - Setting ${e.token} wallet with a balance of ${e.balance}...`),this.$__vm.$set(this.$__store.state.wallet.wallets,e.token,e)):console.warn(`Wallet::SET_WALLET - ${e.token} wallet with a balance of ${e.balance} is outdated; Not setting...`)}async setShadowWallet(e){console.log(`Wallet::SET_WALLET_SHADOW - Setting ${e.token} shadow wallet...`),this.$__vm.$set(this.$__store.state.wallet.shadowWallets,e.token,e)}}const d=new class{constructor(){this.$__db=new n("KnishIO"),this.$__db.version(1).stores({store:"++key, value"})}getDataPromise(e,t="store"){return this.$__db[t].get({key:e}).then((function(e){return!!e&&e.value})).catch((e=>{console.error(e)}))}async setDataPromise(e,t,s="store"){return this.$__db[s].put({key:e,value:t}).catch((e=>{console.error(e)}))}async deleteDataPromise(e,t="store"){return this.$__db[t].delete(e).catch((e=>{console.error(e)}))}};class w{static vuexFields(){return["secret","username","bundle","created_at","metas","auth_token","auth_timeout","logged_in","initialized","user_data"]}static defaultState(){return{secret:null,username:null,bundle:null,created_at:null,metas:null,userData:{},loggedIn:!1,initialized:!1,authToken:"",authTimeout:null}}static fillVuexStorage(e){let t=[{name:"GET_SECRET",fn:async e=>e.user.secret?e.user.secret:d.getDataPromise("secret")},{name:"GET_USERNAME",fn:e=>e.user.username?e.user.username:d.getDataPromise("username")},{name:"GET_AUTH_TOKEN",fn:async e=>{if(e.user.authToken)return e.user.authToken;let t=await d.getDataPromise("authToken");return t?JSON.parse(t):null}}],s=[{name:"SET_SECRET",fn:async(e,t)=>{e.user.secret=t,await d.setDataPromise("secret",t)}},{name:"SET_USERNAME",fn:async(e,t)=>{e.user.username=t,await d.setDataPromise("username",t)}},{name:"SET_AUTH_TOKEN",fn:async(e,t)=>{e.user.authToken=t,await d.setDataPromise("authToken",JSON.stringify(t))}},{name:"RESET_STATE",fn:async(e,t)=>{console.log("User::resetState() - Mutating user state..."),await d.deleteDataPromise("username"),await d.deleteDataPromise("secret"),Object.assign(e.user,t)}}];return _.fillVuexStorage(e,"user",w.vuexFields(),w.defaultState(),t,s)}static instance(e,t,s,a){return w._instance||(w._instance=new w(e,t,s,a)),w._instance}constructor(e,t,s,a){this.$__storage=e,this.$__store=e.$__store,this.$__client=t,this.$__vm=s,this.$__salt=a,this.$__listener=new u(!0),this.wallets=new g(g.vuexModel,s)}async set(e,t){await this.$__storage.set(e,t)}get(e){return this.$__storage.get(e)}async init({newSecret:e=null,username:t=null}){let s;console.log("User::init() - Beginning bootstrap procedure..."),s=e||await this.$__storage.getVuexAsync("secret"),await this.$__storage.setVuex("secret",s),t&&await this.set("username",t),await this.authorize({newSecret:e}),this.$__client.hasSecret()?await this.restore():console.warn("User::init() - User is not logged in..."),await this.$__listener.on("init",this,d),await this.set("initialized",!0),console.log("User::init() - Bootstrap complete...")}async restore(){console.log("User::restore() - Beginning remote restore...");let e=await this.$__client.queryBundle({});if(!e||!Object.keys(e).length)return;await this.restoreWallets();const t=Object.values(e).pop();await this.restoreData(t),await this.set("logged_in",!0),console.log("User::restore() - Restore complete...")}async restoreWallets(){console.log("User::restoreWallets() - Restoring remote wallets...");let e=await this.$__client.queryWallets({});await this.wallets.import(e),console.log("User::restoreWallets() - Restoring complete...")}async restoreData(e){let t={bundle:e.bundleHash,createdAt:Number(e.createdAt),metas:e.metas},s=await this.get("user_data");if(console.log("User::restoreData() - Restoring remote metadata..."),e.metas||console.warn("User::restoreData() - No remote metadata found..."),this.$__storage.attributes().forEach((s=>{console.log(`User::restoreData() - Setting ${s} to ${e.metas[s]}...`),t[s]=e.metas[s]})),!s.cover){const s=require("geopattern");t.cover=s.generate(e.bundleHash).toDataUrl()}await this.set("user_data",t)}async authorize({newSecret:e}){console.log("User::authorize() - Starting authorization process..."),e&&(console.log("User::authorize() - Replacing user secret..."),await this.set("secret",e)),console.log("User::authorize() - Retrieving user identity...");let t=await this.$__storage.getVuexAsync("secret");t&&this.$__client.setSecret(t);let s=await this.$__storage.getVuexAsync("auth_token");console.log(`User::authorize() - Retrieving auth token ${s?s.token:"NONE"}...`),(e||!s||!s.expiresAt||1e3*s.expiresAt<Date.now())&&(s=await this.$__client.authorize({secret:t}),console.log(`User::authorize() - Get a new auth token ${s.token}...`),await this.set("auth_token",s)),this.$__client.setAuthToken(s);let a=await this.get("auth_timeout");clearTimeout(a),console.log(`User::authorize() - Set auth timeout to ${new Date(1e3*s.expiresAt)} ...`);a=setTimeout((t=>{(async t=>{await t.authorize({newSecret:e})})(t)}),1e3*s.expiresAt-Date.now(),this),await this.set("auth_timeout",a)}async login({username:e,password:t,secret:s}){if(console.log("User::login() - Starting login process..."),!this.$__salt)throw"User::login() - Salt is required for secure hashing!";s||(s=o(`${e}:${t}:${this.$__salt}`));const a=l(s),i=await this.$__client.queryBundle({bundle:a});i?console.log(`User::login() - Retrieved ${Object.keys(i).length} results for bundle hash ${a}...`):console.warn(`User::login() - Failed to retrieve results for bundle hash ${a}...`),i&&i[a]&&Object.keys(i[a].metas).length>0?(console.log("User::login() - Logging in..."),await this.init({newSecret:s,username:e}),await this.$__listener.on("loginSuccess",this,d)):(console.warn("User::login() - User not registered; Aborting login..."),await this.logout())}async register({username:e,password:t}){if(console.log("User::register() - Starting registration process..."),!this.$__salt)throw"User::register() - Salt is required for secure hashing!";const s=o(`${e}:${t}:${this.$__salt}`),a=l(s),i=await this.$__client.queryBundle({bundle:a});i?console.log(`User::register() - Retrieved ${Object.keys(i).length} results for bundle hash ${a}...`):console.warn(`User::register() - Failed to retrieve results for bundle hash ${a}...`),i&&i[a]&&Object.keys(i[a].metas).length>0?(console.warn("User::register() - User already registered; Aborting registration..."),await this.logout()):(console.log("User::register() - User not registered; Registration can proceed..."),await this.init({newSecret:s,username:e}))}async logout(){console.log("User::logout() - Clearing user session..."),await this.set("initialized",!1),await this.$__client.deinitialize(),await this.set("logged_in",!1),await this.set("secret",!1),await this.set("username",!1),await this.set("bundle",!1),await this.set("auth_token",!1),await this.set("user_data",{}),await this.wallets.reset(),await this.set("initialized",!0),console.log("User::logout() - User session cleared...")}async subscribeWalletBalance(e,t,s){console.log("User::update() - Subscribe wallet balance...");let a=await this.wallets.getWallets();for(let i in a){if(i===s)continue;let r=a[i],o=this;e.subscribe({query:t,variables:{bundle:r.bundle,token:r.token},fetchPolicy:"no-cache"}).subscribe({next(e){e.data.WalletStatus.token===r.token&&e.data.WalletStatus.balance!==r.balance&&(r.balance=e.data.WalletStatus.balance,o.wallets.setWallet(r))},error(e){console.log(e)}})}}async subscribeActiveWallet(e,t,s){console.log("User::subscribeActiveWallet() - Subscribe active wallet...");let a=await this.wallets.getWallets();for(let i in a){if(i===s)continue;let r=a[i],o=this;e.subscribe({query:t,variables:{bundle:r.bundle},fetchPolicy:"no-cache"}).subscribe({next(e){e.data.ActiveWallet.tokenSlug===r.token&&(r.position=e.data.ActiveWallet.position,r.molecules=e.data.ActiveWallet.molecules,r.batchId=e.data.ActiveWallet.batchId,r.address=e.data.ActiveWallet.address,r.balance=e.data.ActiveWallet.amount,o.wallets.setWallet(r))},error(e){console.log(e)}})}}}export{_ as KnishIOVuexModel,w as User,g as UserWallets,h as identity};
