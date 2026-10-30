export type Interest = {id:string; name:string; type:string; image?:string};
export type Profile = {origin:string; budget:number; days:number; travelers:number; date:string; interests:Interest[]; visited:string; pace:'Relaxed'|'Balanced'|'Packed'; international:boolean};
export type Stop = {id:string; name:string; category:string; lat:number; lon:number; duration:number; image:string; description:string; evidence?:unknown; affinity?:number; status:'demo'|'qloo';};
export type City = {id:string; name:string; country:string; lat:number; lon:number; image:string; description:string; affinity?:number; evidence?:unknown; costs?:{flights:number;stay:number;food:number;local:number}; stops:Stop[]; status:'demo'|'qloo';};
export type Scheduled = Stop & {arrival:number; travel:number; done?:boolean};
