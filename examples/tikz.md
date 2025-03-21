
```latex {cmd=true latex_width=100%}
\documentclass{standalone}
\usepackage{tikz}
\usepackage{adjustbox}
\usepackage{helvet}  
\usepackage{sansmathfonts}  
\renewcommand{\familydefault}{\sfdefault}  
\usetikzlibrary{arrows.meta,calc,decorations.pathmorphing}
\usetikzlibrary{shapes.geometric, shapes.arrows}
\usepackage[svgnames]{xcolor}

\definecolor{colorFFFFFF}{HTML}{FFFFFF}
\definecolor{color000000}{HTML}{000000}
\begin{document}
\begin{tikzpicture}



\node[shape=rectangle, fill=colorFFFFFF, draw=color000000, line width=0.02cm, minimum width=2cm, minimum height=2cm] (center) at (0,0) {Center};
\node[shape=rectangle, fill=colorFFFFFF, draw=color000000, line width=0.02cm, minimum width=2cm, minimum height=2cm] (left1) at (center.north) [xshift=1cm, yshift=-0.5cm]  {Left};


\end{tikzpicture}
\end{document}
```
(-4,0) 




