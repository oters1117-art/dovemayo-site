from pathlib import Path
import numpy as np,soundfile as sf
from scipy.signal import butter,sosfilt
sr=44100;out=Path('dist/audio');rng=np.random.default_rng(419)
def save(name,x,peak=.72):
 x=np.asarray(x);x*=peak/max(np.max(abs(x)),1e-8);n=min(440,len(x)//4);x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n);sf.write(out/(name+'.ogg'),x,sr,format='OGG',subtype='VORBIS')
def low(x,f):return sosfilt(butter(3,f,fs=sr,output='sos'),x)
# Select the first bell strike, remove recording silence, preserve natural tail.
x,_=sf.read('.sites-runtime/church.wav');env=np.convolve(x*x,np.ones(441)/441,'same');peak=np.max(env);ix=np.flatnonzero(env>peak*.2);start=max(0,ix[0]-220);save('church-bell',low(x[start:start+int(sr*2.4)],4100)*np.exp(-np.arange(min(int(sr*2.4),len(x)-start))/sr*.15),.6)
x,_=sf.read('.sites-runtime/firecracker.wav');peak=int(np.argmax(abs(x)));x=x[max(0,peak-220):];tail=np.zeros(int(sr*1.8));tail[:min(len(x),len(tail))]=x[:len(tail)];rounded=low(tail,1800);bright=low(tail,4300);t=np.arange(len(tail))/sr;y=bright*np.exp(-t*18)+rounded*(1-np.exp(-t*18));
for delay,gain in [(.08,.3),(.17,.18),(.29,.09)]:
 n=int(sr*delay);y[n:]+=rounded[:-n]*gain
save('firework-soft',y,.78)
x,_=sf.read('.sites-runtime/fuse.wav');x=low(x[sr:sr*3],3300);n=2205;x[:n]=x[:n]*np.linspace(0,1,n)+x[-n:]*np.linspace(1,0,n);save('fuse-soft',x[:-n],.45)
# Pentatonic electrical notes: gentle fundamental, soft buzz, tiny noise layer.
for i,f in enumerate([523.25,587.33,659.25,783.99,880]):
 t=np.arange(int(sr*.24))/sr;env=(1-np.exp(-t*180))*np.exp(-t*15);x=(np.sin(2*np.pi*f*t)+.17*np.sin(2*np.pi*f*2*t)+.06*np.sin(2*np.pi*f*3*t))*(.85+.15*np.sin(t*2*np.pi*45));x+=low(rng.normal(0,.035,len(t)),2600);save('zap-note-'+str(i),x*env,.45)
