import{C as e,E as O,s as t,t as n,b as a,L as r,i as l,e as s,U as o,a as y,o as i}from"./codemirror.js";function $(e){return 45==e||46==e||58==e||e>=65&&e<=90||95==e||e>=97&&e<=122||e>=161}let c=null,p=null,S=0;function m(e,O){let t=e.pos+O;if(p==e&&S==t)return c;for(;9==(n=e.peek(O))||10==n||13==n||32==n;)O++;var n;let a="";for(;;){let t=e.peek(O);if(!$(t))break;a+=String.fromCharCode(t),O++}return p=e,S=t,c=a||null}function u(e,O){this.name=e,this.parent=O,this.hash=O?O.hash:0;for(let O=0;O<e.length;O++)this.hash+=(this.hash<<4)+e.charCodeAt(O)+(e.charCodeAt(O)<<8)}const f=new e({start:null,shift:(e,O,t,n)=>1==O?new u(m(n,1)||"",e):e,reduce:(e,O)=>11==O&&e?e.parent:e,reuse(e,O,t,n){let a=O.type.id;return 1==a||13==a?new u(m(n,1)||"",e):e},hash:e=>e?e.hash:0,strict:!1}),g=new O(((e,O)=>{if(60==e.next)if(e.advance(),47==e.next){e.advance();let t=m(e,0);if(!t)return e.acceptToken(5);if(O.context&&t==O.context.name)return e.acceptToken(2);for(let n=O.context;n;n=n.parent)if(n.name==t)return e.acceptToken(3,-2);e.acceptToken(4)}else if(33!=e.next&&63!=e.next)return e.acceptToken(1)}),{contextual:!0});function d(e,t){return new O((O=>{for(let n=0,a=0;;a++){if(O.next<0){a&&O.acceptToken(e);break}if(O.next==t.charCodeAt(n)){if(n++,n==t.length){a>=t.length&&O.acceptToken(e,1-t.length);break}}else n=O.next==t.charCodeAt(0)?1:0;O.advance()}}))}const P=d(35,"--\x3e"),_=d(36,"?>"),T=d(37,"]]>"),h=t({Text:n.content,"StartTag StartCloseTag EndTag SelfCloseEndTag":n.angleBracket,TagName:n.tagName,"MismatchedCloseTag/Tagname":[n.tagName,n.invalid],AttributeName:n.attributeName,AttributeValue:n.attributeValue,Is:n.definitionOperator,"EntityReference CharacterReference":n.character,Comment:n.blockComment,ProcessingInst:n.processingInstruction,DoctypeDecl:n.documentMeta,Cdata:n.special(n.string)}),v=a.deserialize({version:14,states:",SOQOaOOOrOxO'#CfOzOpO'#CiO!tOaO'#CgOOOP'#Cg'#CgO!{OrO'#CrO#TOtO'#CsO#]OpO'#CtOOOP'#DS'#DSOOOP'#Cv'#CvQQOaOOOOOW'#Cw'#CwO#eOxO,59QOOOP,59Q,59QOOOO'#Cx'#CxO#mOpO,59TO#uO!bO,59TOOOP'#C{'#C{O$TOaO,59RO$[OpO'#CoOOOP,59R,59ROOOQ'#C|'#C|O$dOrO,59^OOOP,59^,59^OOOS'#C}'#C}O$lOtO,59_OOOP,59_,59_O$tOpO,59`O$|OpO,59`OOOP-E6t-E6tOOOW-E6u-E6uOOOP1G.l1G.lOOOO-E6v-E6vO%UO!bO1G.oO%UO!bO1G.oO%dOpO'#CkO%lO!bO'#CyO%zO!bO1G.oOOOP1G.o1G.oOOOP1G.w1G.wOOOP-E6y-E6yOOOP1G.m1G.mO&VOpO,59ZO&_OpO,59ZOOOQ-E6z-E6zOOOP1G.x1G.xOOOS-E6{-E6{OOOP1G.y1G.yO&gOpO1G.zO&gOpO1G.zOOOP1G.z1G.zO&oO!bO7+$ZO&}O!bO7+$ZOOOP7+$Z7+$ZOOOP7+$c7+$cO'YOpO,59VO'bOpO,59VO'jO!bO,59eOOOO-E6w-E6wO'xOpO1G.uO'xOpO1G.uOOOP1G.u1G.uO(QOpO7+$fOOOP7+$f7+$fO(YO!bO<<GuOOOP<<Gu<<GuOOOP<<G}<<G}O'bOpO1G.qO'bOpO1G.qO(eO#tO'#CnOOOO1G.q1G.qO(sOpO7+$aOOOP7+$a7+$aOOOP<<HQ<<HQOOOPAN=aAN=aOOOPAN=iAN=iO'bOpO7+$]OOOO7+$]7+$]OOOO'#Cz'#CzO({O#tO,59YOOOO,59Y,59YOOOP<<G{<<G{OOOO<<Gw<<GwOOOO-E6x-E6xOOOO1G.t1G.t",stateData:")Z~OPQOSVOTWOVWOWWOXWOiXOxPO}TO!PUO~OuZOw]O~O^`Oy^O~OPQOQcOSVOTWOVWOWWOXWOxPO}TO!PUO~ORdO~P!SOseO|gO~OthO!OjO~O^lOy^O~OuZOwoO~O^qOy^O~O[vO`sOdwOy^O~ORyO~P!SO^{Oy^O~OseO|}O~OthO!O!PO~O^!QOy^O~O[!SOy^O~O[!VO`sOd!WOy^O~Oa!YOy^O~Oy^O[mX`mXdmX~O[!VO`sOd!WO~O^!]Oy^O~O[!_Oy^O~O[!aOy^O~O[!cO`sOd!dOy^O~O[!cO`sOd!dO~Oa!eOy^O~Oy^Oz!gO~Oy^O[ma`madma~O[!jOy^O~O[!kOy^O~O[!lO`sOd!mO~OW!pOX!pOz!rO{!pO~O[!sOy^O~OW!pOX!pOz!vO{!pO~O",goto:"%[wPPPPPPPPPPxxP!OP!UPP!_!iP!oxxxP!u!{#R$Z$j$p$v$|PPPP%SXWORYbXRORYb_t`qru!T!U!bQ!h!YS!o!e!fR!t!nQdRRybXSORYbQYORmYQ[PRn[Q_QQkVjp_krz!R!T!X!Z!^!`!f!i!nQr`QzcQ!RlQ!TqQ!XsQ!ZtQ!^{Q!`!QQ!f!YQ!i!]R!n!eQu`S!UqrU![u!U!bR!b!TQ!q!gR!u!qQbRRxbQfTR|fQiUR!OiSXOYTaRb",nodeNames:"⚠ StartTag StartCloseTag MissingCloseTag StartCloseTag StartCloseTag Document Text EntityReference CharacterReference Cdata Element EndTag OpenTag TagName Attribute AttributeName Is AttributeValue CloseTag SelfCloseEndTag SelfClosingTag Comment ProcessingInst MismatchedCloseTag DoctypeDecl",maxTerm:47,context:f,nodeProps:[["closedBy",1,"SelfCloseEndTag EndTag",13,"CloseTag MissingCloseTag"],["openedBy",12,"StartTag StartCloseTag",19,"OpenTag",20,"StartTag"]],propSources:[h],skippedNodes:[0],repeatNodeCount:8,tokenData:"IX~R!XOX$nXY&kYZ&kZ]$n]^&k^p$npq&kqr$nrs'ssv$nvw(Zw}$n}!O*l!O!P$n!P!Q,{!Q![$n![!].e!]!^$n!^!_1v!_!`Cz!`!aDm!a!bE`!b!c$n!c!}.e!}#P$n#P#QFx#Q#R$n#R#S.e#S#T$n#T#o.e#o%W$n%W%o.e%o%p$n%p&a.e&a&b$n&b1p.e1p4U$n4U4d.e4d4e$n4e$IS.e$IS$I`$n$I`$Ib.e$Ib$Kh$n$Kh%#t.e%#t&/x$n&/x&Et.e&Et&FV$n&FV;'S.e;'S;:j1p;:j;=`&e<%l?&r$n?&r?Ah.e?Ah?BY$n?BY?Mn.e?MnO$nX$uWVP{WOr$nrs%_sv$nw!^$n!^!_%y!_;'S$n;'S;=`&e<%lO$nP%dTVPOv%_w!^%_!_;'S%_;'S;=`%s<%lO%_P%vP;=`<%l%_W&OT{WOr%ysv%yw;'S%y;'S;=`&_<%lO%yW&bP;=`<%l%yX&hP;=`<%l$n_&t_VP{WyUOX$nXY&kYZ&kZ]$n]^&k^p$npq&kqr$nrs%_sv$nw!^$n!^!_%y!_;'S$n;'S;=`&e<%lO$nZ'zTzYVPOv%_w!^%_!_;'S%_;'S;=`%s<%lO%_~(^VOp(sqs(sst)ht!](s!^;'S(s;'S;=`)b<%lO(s~(vVOp(sqs(st!](s!]!^)]!^;'S(s;'S;=`)b<%lO(s~)bOW~~)eP;=`<%l(s~)kTOp)zq!])z!^;'S)z;'S;=`*f<%lO)z~)}UOp)zq!])z!]!^*a!^;'S)z;'S;=`*f<%lO)z~*fOX~~*iP;=`<%l)zZ*sYVP{WOr$nrs%_sv$nw}$n}!O+c!O!^$n!^!_%y!_;'S$n;'S;=`&e<%lO$nZ+jYVP{WOr$nrs%_sv$nw!^$n!^!_%y!_!`$n!`!a,Y!a;'S$n;'S;=`&e<%lO$nZ,cW|QVP{WOr$nrs%_sv$nw!^$n!^!_%y!_;'S$n;'S;=`&e<%lO$n]-SYVP{WOr$nrs%_sv$nw!^$n!^!_%y!_!`$n!`!a-r!a;'S$n;'S;=`&e<%lO$n]-{WdSVP{WOr$nrs%_sv$nw!^$n!^!_%y!_;'S$n;'S;=`&e<%lO$n_.p!O`S^QVP{WOr$nrs%_sv$nw}$n}!O.e!O!P.e!P!Q$n!Q![.e![!].e!]!^$n!^!_%y!_!c$n!c!}.e!}#R$n#R#S.e#S#T$n#T#o.e#o$}$n$}%O.e%O%W$n%W%o.e%o%p$n%p&a.e&a&b$n&b1p.e1p4U.e4U4d.e4d4e$n4e$IS.e$IS$I`$n$I`$Ib.e$Ib$Je$n$Je$Jg.e$Jg$Kh$n$Kh%#t.e%#t&/x$n&/x&Et.e&Et&FV$n&FV;'S.e;'S;:j1p;:j;=`&e<%l?&r$n?&r?Ah.e?Ah?BY$n?BY?Mn.e?MnO$n_1sP;=`<%l.eX1{W{WOq%yqr2esv%yw!a%y!a!bCd!b;'S%y;'S;=`&_<%lO%yX2j]{WOr%ysv%yw}%y}!O3c!O!f%y!f!g4e!g!}%y!}#O9t#O#W%y#W#X@Q#X;'S%y;'S;=`&_<%lO%yX3hV{WOr%ysv%yw}%y}!O3}!O;'S%y;'S;=`&_<%lO%yX4UT}P{WOr%ysv%yw;'S%y;'S;=`&_<%lO%yX4jV{WOr%ysv%yw!q%y!q!r5P!r;'S%y;'S;=`&_<%lO%yX5UV{WOr%ysv%yw!e%y!e!f5k!f;'S%y;'S;=`&_<%lO%yX5pV{WOr%ysv%yw!v%y!v!w6V!w;'S%y;'S;=`&_<%lO%yX6[V{WOr%ysv%yw!{%y!{!|6q!|;'S%y;'S;=`&_<%lO%yX6vV{WOr%ysv%yw!r%y!r!s7]!s;'S%y;'S;=`&_<%lO%yX7bV{WOr%ysv%yw!g%y!g!h7w!h;'S%y;'S;=`&_<%lO%yX7|X{WOr7wrs8isv7wvw8iw!`7w!`!a9W!a;'S7w;'S;=`9n<%lO7wP8lTO!`8i!`!a8{!a;'S8i;'S;=`9Q<%lO8iP9QOiPP9TP;=`<%l8iX9_TiP{WOr%ysv%yw;'S%y;'S;=`&_<%lO%yX9qP;=`<%l7wX9yX{WOr%ysv%yw!e%y!e!f:f!f#V%y#V#W=t#W;'S%y;'S;=`&_<%lO%yX:kV{WOr%ysv%yw!f%y!f!g;Q!g;'S%y;'S;=`&_<%lO%yX;VV{WOr%ysv%yw!c%y!c!d;l!d;'S%y;'S;=`&_<%lO%yX;qV{WOr%ysv%yw!v%y!v!w<W!w;'S%y;'S;=`&_<%lO%yX<]V{WOr%ysv%yw!c%y!c!d<r!d;'S%y;'S;=`&_<%lO%yX<wV{WOr%ysv%yw!}%y!}#O=^#O;'S%y;'S;=`&_<%lO%yX=eT{WxPOr%ysv%yw;'S%y;'S;=`&_<%lO%yX=yV{WOr%ysv%yw#W%y#W#X>`#X;'S%y;'S;=`&_<%lO%yX>eV{WOr%ysv%yw#T%y#T#U>z#U;'S%y;'S;=`&_<%lO%yX?PV{WOr%ysv%yw#h%y#h#i?f#i;'S%y;'S;=`&_<%lO%yX?kV{WOr%ysv%yw#T%y#T#U<r#U;'S%y;'S;=`&_<%lO%yX@VV{WOr%ysv%yw#c%y#c#d@l#d;'S%y;'S;=`&_<%lO%yX@qV{WOr%ysv%yw#V%y#V#WAW#W;'S%y;'S;=`&_<%lO%yXA]V{WOr%ysv%yw#h%y#h#iAr#i;'S%y;'S;=`&_<%lO%yXAwV{WOr%ysv%yw#m%y#m#nB^#n;'S%y;'S;=`&_<%lO%yXBcV{WOr%ysv%yw#d%y#d#eBx#e;'S%y;'S;=`&_<%lO%yXB}V{WOr%ysv%yw#X%y#X#Y7w#Y;'S%y;'S;=`&_<%lO%yXCkT!PP{WOr%ysv%yw;'S%y;'S;=`&_<%lO%yZDTWaQVP{WOr$nrs%_sv$nw!^$n!^!_%y!_;'S$n;'S;=`&e<%lO$n_DvW[UVP{WOr$nrs%_sv$nw!^$n!^!_%y!_;'S$n;'S;=`&e<%lO$nZEgYVP{WOr$nrs%_sv$nw!^$n!^!_%y!_!`$n!`!aFV!a;'S$n;'S;=`&e<%lO$nZF`W!OQVP{WOr$nrs%_sv$nw!^$n!^!_%y!_;'S$n;'S;=`&e<%lO$nZGPYVP{WOr$nrs%_sv$nw!^$n!^!_%y!_#P$n#P#QGo#Q;'S$n;'S;=`&e<%lO$nZGvYVP{WOr$nrs%_sv$nw!^$n!^!_%y!_!`$n!`!aHf!a;'S$n;'S;=`&e<%lO$nZHoWwQVP{WOr$nrs%_sv$nw!^$n!^!_%y!_;'S$n;'S;=`&e<%lO$n",tokenizers:[g,P,_,T,0,1,2,3],topRules:{Document:[0,6]},tokenPrec:0});function b(e,O){let t=O&&O.getChild("TagName");return t?e.sliceString(t.from,t.to):""}function C(e,O){let t=O&&O.firstChild;return t&&"OpenTag"==t.name?b(e,t):""}function W(e){for(let O=e&&e.parent;O;O=O.parent)if("Element"==O.name)return O;return null}class w{constructor(e,O,t){this.attrs=O,this.attrValues=t,this.children=[],this.name=e.name,this.completion=Object.assign(Object.assign({type:"type"},e.completion||{}),{label:this.name}),this.openCompletion=Object.assign(Object.assign({},this.completion),{label:"<"+this.name}),this.closeCompletion=Object.assign(Object.assign({},this.completion),{label:"</"+this.name+">",boost:2}),this.closeNameCompletion=Object.assign(Object.assign({},this.completion),{label:this.name+">"}),this.text=e.textContent?e.textContent.map((e=>({label:e,type:"text"}))):[]}}const V=/^[:\-\.\w\u00b7-\uffff]*$/;function x(e){return Object.assign(Object.assign({type:"property"},e.completion||{}),{label:e.name})}function X(e){return"string"==typeof e?{label:`"${e}"`,type:"constant"}:/^"/.test(e.label)?e:Object.assign(Object.assign({},e),{label:`"${e.label}"`})}function Q(e,O){let t=[],n=[],a=Object.create(null);for(let e of O){let O=x(e);t.push(O),e.global&&n.push(O),e.values&&(a[e.name]=e.values.map(X))}let r=[],l=[],s=Object.create(null);for(let O of e){let e=n,o=a;O.attributes&&(e=e.concat(O.attributes.map((e=>"string"==typeof e?t.find((O=>O.label==e))||{label:e,type:"property"}:(e.values&&(o==a&&(o=Object.create(o)),o[e.name]=e.values.map(X)),x(e))))));let y=new w(O,e,o);s[y.name]=y,r.push(y),O.top&&l.push(y)}l.length||(l=r);for(let O=0;O<r.length;O++){let t=e[O],n=r[O];if(t.children)for(let e of t.children)s[e]&&n.children.push(s[e]);else n.children=r}return e=>{var O;let{doc:t}=e.state,o=function(e,O){var t;let n=i(e).resolveInner(O,-1),a=null;for(let e=n;!a&&e.parent;e=e.parent)"OpenTag"!=e.name&&"CloseTag"!=e.name&&"SelfClosingTag"!=e.name&&"MismatchedCloseTag"!=e.name||(a=e);if(a&&(a.to>O||a.lastChild.type.isError)){let e=a.parent;if("TagName"==n.name)return"CloseTag"==a.name||"MismatchedCloseTag"==a.name?{type:"closeTag",from:n.from,context:e}:{type:"openTag",from:n.from,context:W(e)};if("AttributeName"==n.name)return{type:"attrName",from:n.from,context:a};if("AttributeValue"==n.name)return{type:"attrValue",from:n.from,context:a};let t=n==a||"Attribute"==n.name?n.childBefore(O):n;return"StartTag"==(null==t?void 0:t.name)?{type:"openTag",from:O,context:W(e)}:"StartCloseTag"==(null==t?void 0:t.name)&&t.to<=O?{type:"closeTag",from:O,context:e}:"Is"==(null==t?void 0:t.name)?{type:"attrValue",from:O,context:a}:t?{type:"attrName",from:O,context:a}:null}if("StartCloseTag"==n.name)return{type:"closeTag",from:O,context:n.parent};for(;n.parent&&n.to==O&&!(null===(t=n.lastChild)||void 0===t?void 0:t.type.isError);)n=n.parent;return"Element"==n.name||"Text"==n.name||"Document"==n.name?{type:"tag",from:O,context:"Element"==n.name?n:W(n)}:null}(e.state,e.pos);if(!o||"tag"==o.type&&!e.explicit)return null;let{type:y,from:$,context:c}=o;if("openTag"==y){let e=l,O=C(t,c);if(O){let t=s[O];e=(null==t?void 0:t.children)||r}return{from:$,options:e.map((e=>e.completion)),validFor:V}}if("closeTag"==y){let n=C(t,c);return n?{from:$,to:e.pos+(">"==t.sliceString(e.pos,e.pos+1)?1:0),options:[(null===(O=s[n])||void 0===O?void 0:O.closeNameCompletion)||{label:n+">",type:"type"}],validFor:V}:null}if("attrName"==y){let e=s[b(t,c)];return{from:$,options:(null==e?void 0:e.attrs)||n,validFor:V}}if("attrValue"==y){let O=function(e,O,t){let n=O&&O.getChildren("Attribute").find((e=>e.from<=t&&e.to>=t)),a=n&&n.getChild("AttributeName");return a?e.sliceString(a.from,a.to):""}(t,c,$);if(!O)return null;let n=s[b(t,c)],r=((null==n?void 0:n.attrValues)||a)[O];return r&&r.length?{from:$,to:e.pos+('"'==t.sliceString(e.pos,e.pos+1)?1:0),options:r,validFor:/^"[^"]*"?$/}:null}if("tag"==y){let O=C(t,c),n=s[O],a=[],o=c&&c.lastChild;!O||o&&"CloseTag"==o.name&&b(t,o)==O||a.push(n?n.closeCompletion:{label:"</"+O+">",type:"type",boost:2});let y=a.concat(((null==n?void 0:n.children)||(c?r:l)).map((e=>e.openCompletion)));if(c&&(null==n?void 0:n.text.length)){let O=c.firstChild;O.to>e.pos-20&&!/\S/.test(e.state.sliceDoc(O.to,e.pos))&&(y=y.concat(n.text))}return{from:$,options:y,validFor:/^<\/?[:\-\.\w\u00b7-\uffff]*$/}}return null}}const G=r.define({name:"xml",parser:v.configure({props:[l.add({Element(e){let O=/^\s*<\//.test(e.textAfter);return e.lineIndent(e.node.from)+(O?0:e.unit)},"OpenTag CloseTag SelfClosingTag":e=>e.column(e.node.from)+e.unit}),s.add({Element(e){let O=e.firstChild,t=e.lastChild;return O&&"OpenTag"==O.name?{from:O.to,to:"CloseTag"==t.name?t.from:e.to}:null}}),o.add({"OpenTag CloseTag":e=>e.getChild("TagName")})]}),languageData:{commentTokens:{block:{open:"\x3c!--",close:"--\x3e"}},indentOnInput:/^\s*<\/$/}});function E(e={}){return new y(G,G.data.of({autocomplete:Q(e.elements||[],e.attributes||[])}))}export{Q as completeFromSchema,E as xml,G as xmlLanguage};
//# sourceMappingURL=xml.js.map
