from pathlib import Path
import numpy as np,soundfile as sf
from scipy.signal import butter,sosfilt,resample_poly
p=Path('dist/audio');sr=44100;rng=np.random.default_rng(319)
def save(name,x,peak=.7):
 x=sosfilt(butter(3,4200,fs=sr,output='sos'),x);x*=min(1,peak/(max(abs(x))+1e-9));n=min(280,len(x)//4);x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n);sf.write(p/(name+'.ogg'),x,sr,format='OGG',subtype='VORBIS')
def source(n):
 x,r=sf.read(p/(n+'.ogg'));x=x.mean(1) if x.ndim>1 else x;return resample_poly(x,sr,r)
for i,(a,b) in enumerate([(697,1209),(770,1336),(852,1477)]):
 t=np.arange(int(sr*.11))/sr;save('phone-soft-'+str(i),(.17*np.sin(2*np.pi*a*t)+.13*np.sin(2*np.pi*b*t))*np.sin(np.pi*t/.11)**2)
t=np.arange(int(sr*1.75))/sr;env=(1-np.exp(-t*200))*np.exp(-t*3.5);x=sum(np.sin(2*np.pi*f*t)*a for f,a in [(1046,.3),(2099,.11),(2871,.035),(3490,.014)])*env;save('chime-soft',x)
t=np.arange(int(sr*.17))/sr;save('billiard-soft',(np.sin(2*np.pi*850*t)*.3+np.sin(2*np.pi*1930*t)*.12+rng.normal(size=len(t))*.025)*np.exp(-t*43)*(1-np.exp(-t*1200)))
t=np.arange(int(sr*1.8))/sr;x=np.resize(source('cloth-0'),len(t))*.32+np.resize(source('underwater-clear'),len(t))*.11
for pos in [.03,.19,.38,.62,.93,1.28,1.58]:
 z=np.maximum(0,t-pos);x+=np.where(t>=pos,(np.sin(2*np.pi*710*z)*.14+np.sin(2*np.pi*1255*z)*.07)*np.exp(-z*60)*(1-np.exp(-z*900)),0)
save('roll-soft',x*np.sin(np.pi*(t+.03)/1.86)**.4)
x=np.concatenate([source('bubble-deep')*.7,source('bubble-clear-3')*.45,source('bubble-clear-0')*.5]);save('slime-soft',x)
t=np.arange(int(sr*.5))/sr;noise=sosfilt(butter(2,850,fs=sr,output='sos'),rng.normal(size=len(t)));save('air-soft',(noise*.55+np.sin(2*np.pi*(130*t-60*t*t))*.15)*np.sin(np.pi*t/.5)**2)
# Continuous low wind bed; gentle crossfade at the loop boundary.
t=np.arange(int(sr*2.4))/sr;noise=sosfilt(butter(2,900,fs=sr,output='sos'),rng.normal(size=len(t)));save('wind-soft',noise*.48*(.8+.2*np.sin(t*2*np.pi/2.4)))
print('Updated soft rolling, billiard, bell, phone, wind and slime cues')
