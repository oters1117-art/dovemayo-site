import {planSnapshotRoute} from './navigation-snapshot.mjs?v=1';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,route:planSnapshotRoute(data.snapshot)});}catch{self.postMessage({id:data.id,route:null});}};
