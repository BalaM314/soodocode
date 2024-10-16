import { isKey } from "../utils/funcs.js";
import { Config, configs } from "./config.js";

const configsKey = "soodocode:configs";
export function saveConfigs(){
	const data = JSON.stringify(Object.fromEntries(Object.entries(configs).map(([category, items]) => 
		[category, Object.fromEntries(Object.entries(items).map(([key, config]) =>
			[key, config.value]
		))]
	)));
	localStorage.setItem(configsKey, data);
}
export function loadConfigs(){
	//typescript is a wonderful programming language!
	const dataString = localStorage.getItem(configsKey);
	if(!dataString) return;
	try {
		const data = JSON.parse(dataString) as Record<string, unknown>;
		for(const [category, items] of Object.entries(data)){
			if(isKey(configs, category) && typeof items == "object" && items != null){
				for(const [key, value] of Object.entries(items as Record<string, unknown>)){
					if(isKey(configs[category], key)){
						if(typeof (configs[category][key] as Config<any, boolean>).value == typeof value){
							(configs[category][key] as Config<any, boolean>).value = value;
						}
					}
				}
			}
		}
	} catch { /* ignore */ }
}
export function resetToDefaults(){
	for(const config of Object.values(configs).map(c => Object.values(c)).flat()){
		config.value = config.defaultValue;
	}
}
