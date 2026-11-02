'use client';
import {useCallback,useEffect,useState} from 'react';
import {seedTasks,seedKnowledge,seedFlows,type Task,type Knowledge,type Flow,type Activity} from './workbench-data';
export type Snapshot={tasks:Task[];knowledge:Knowledge[];flows:Flow[];activities:Activity[];aiMode:'demo'|'live'};
export async function workspaceAction(body:Record<string,unknown>){const res=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json() as {error?:string;task:Task;id?:string};if(!res.ok)throw new Error(data.error||'操作失败，请重试');return data;}
export function useWorkspace(){
 const [state,setState]=useState<Snapshot>({tasks:seedTasks,knowledge:seedKnowledge,flows:seedFlows,activities:[],aiMode:'demo'});
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{try{const res=await fetch('/api/workspace',{cache:'no-store'});const data=await res.json() as Snapshot&{error?:string};if(!res.ok)throw new Error(data.error);setState(data);setError('');}catch(e){setError(e instanceof Error?e.message:'连接工作空间失败')}finally{setLoading(false)}},[]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),20000);return()=>clearInterval(timer)},[refresh]);
 const mutate=useCallback(async(body:Record<string,unknown>)=>{const data=await workspaceAction(body);await refresh();return data},[refresh]);
 return {...state,loading,error,refresh,mutate};
}
export function downloadText(filename:string,content:string,mime='text/markdown;charset=utf-8'){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename.replace(/[<>:"/\\|?*]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function csvCell(value:string){const v=/^[\s]*[=+\-@]/.test(value)?`'${value}`:value;return `"${v.replace(/"/g,'""')}"`;}
