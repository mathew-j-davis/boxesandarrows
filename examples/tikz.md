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
\definecolor{color0011FF}{HTML}{0011FF}
\begin{document}
\begin{tikzpicture}







\node[shape=rectangle, align=left, fill=colorFFFFFF, draw=color000000, line width=0.02cm, minimum width=2cm, minimum height=2cm] (center) at (10,0) {\adjustbox{max width=2cm, max height=2cm, stack=l}{\textcolor{color0011FF}{\small{\sffamily{example\\center}}}}}; 

\end{tikzpicture}
\end{document}
```

zzzzzzz

{\textcolor{color0011FF}{\small{\sffamily{example\\center}}}};

\textcolor{color001122}{\small{\sffamily{b}}}}

{\ adjustbox { minipage =5 cm , angle = -10}{%
Some example code which will
be automatically broken or can include \\
line breaks \ footnote { AND footnotes !!}\\
or verbatim \ verb + @ %^&} _ +!%
}}


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

\node (example-align) [draw, align=left](center) at (0,0) {example \\[5em] example example};
\end{tikzpicture}
\end{document}
```