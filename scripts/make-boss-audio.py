from pathlib import Path
import numpy as np,soundfile as sf
from scipy.signal import butter,sosfilt,resample_poly
rng=np.random.default_rng(182);sr=44100;p=Path('dist/audio')
def soft(x,peak=.45):
 x=sosfilt(butter(3,3300,fs=sr,output='sos'),x);x*=min(1,peak/(max(abs(x))+.000001));n=min(450,len(x)//5);x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n);return x
# Close rolling texture: filtered cloth grain and quiet rounded glass contacts.
def source(name):
 x,rate=sf.read(p/(name+'.ogg'));x=x.mean(axis=1) if x.ndim>1 else x
 return resample_poly(x,sr,rate)
def save(name,x):sf.write(p/(name+'.ogg'),soft(x),sr,format='OGG',subtype='VORBIS')
t=np.arange(int(sr*1.6))/sr;grain=np.resize(source('cloth-0'),len(t));x=grain*.42*(np.sin(np.pi*t/1.6)**2)
for pos in [.08,.18,.31,.49,.73,1.03]:
 z=np.maximum(0,t-pos);x+=np.where(t>=pos,np.sin(2*np.pi*420*z)*np.exp(-z*85)*(1-np.exp(-z*800))*.09,0)
save('roll-soft',x)
t=np.arange(int(sr*.22))/sr;x=rng.normal(size=len(t))*.035*np.sin(np.pi*t/.22)**2+np.sin(2*np.pi*160*t)*.07*np.sin(np.pi*t/.22)**2;save('zap-soft',x)
t=np.arange(int(sr*.16))/sr;env=np.sin(np.pi*t/.16)**2;save('phone-soft',(.09*np.sin(2*np.pi*697*t)+.07*np.sin(2*np.pi*1209*t))*env)
t=np.arange(int(sr*1.5))/sr;env=(1-np.exp(-t*90))*np.exp(-t*4);save('chime-soft',sum(np.sin(2*np.pi*f*t)*a for f,a in [(659,.22),(1318,.055),(1838,.018)])*env)
t=np.arange(int(sr*2.2))/sr;save('wind-soft',sosfilt(butter(2,650,fs=sr,output='sos'),rng.normal(size=len(t)))*.15*np.sin(np.pi*t/2.2)**2)
with (p/'CREDITS.txt').open('a',encoding='utf-8') as f:f.write('\nBoss preview: roll-soft combines existing credited cloth with synthesized rounded contacts. zap-soft, phone-soft, chime-soft, wind-soft are locally synthesized, gently filtered original effects (scripts/make-boss-audio.py).\n')
print('Generated five soft boss cues')
