//component.js
import React, { Component } from "react";
import { Popover, OverlayTrigger } from "react-bootstrap";
import RX, {
  convertMask,
  contract,
  RXInputMask,
  isMeta
} from "incr-regex-package";

// const RX = require("incr-regex-package");
// const {convertMask,contract,RXInputMask,isMeta} = RX;
/**
 * Copyright (c) 2016, Nurul Choudhury
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 */

//
// Modified from https://github.com/insin/react-maskedinput
//  This was originally written by insin - on GIT hub
//  The code worked fine for fixed formatted input mask, but is not so useful for
//  varible mask based on regular expression (RegExp)
//  That capability regires this implementation of Regexp, and provides incremental processing of regular expression
// Amost the entire original code has been replaces but the original interfaces remain
//

//const convertMask = convertMask;
const rxPlaceHolder = new RegExp(convertMask("[?*]"));
const KEYCODE_Z = 90;
const KEYCODE_Y = 89;

function except(object, list) {
  let result = {};
  let keys = list;

  for (let key in object) {
    if (keys.indexOf(key) === -1) {
      result[key] = object[key];
    }
  }

  return result;
}

function isUndo(e) {
  return (
    (e.ctrlKey || e.metaKey) &&
    e.keyCode === (e.shiftKey ? KEYCODE_Y : KEYCODE_Z)
  );
}

function isRedo(e) {
  return (
    (e.ctrlKey || e.metaKey) &&
    e.keyCode === (e.shiftKey ? KEYCODE_Z : KEYCODE_Y)
  );
}

function getSelection(el) {
  let start, end, rangeEl, clone;

  if (el.selectionStart !== undefined) {
    start = el.selectionStart;
    end = el.selectionEnd;
  } else {
    try {
      el.focus();
      rangeEl = el.createTextRange();
      clone = rangeEl.duplicate();

      rangeEl.moveToBookmark(document.selection.createRange().getBookmark());
      clone.setEndPoint("EndToStart", rangeEl);

      start = clone.text.length;
      end = start + rangeEl.text.length;
    } catch (e) {
      /* not focused or not visible */
    }
  }

  return { start, end };
}

function setSelection(el, selection) {
  let rangeEl;

  try {
    if (el.selectionStart !== undefined) {
      el.focus();
      el.setSelectionRange(selection.start, selection.end);
    } else {
      el.focus();
      rangeEl = el.createTextRange();
      rangeEl.collapse(true);
      rangeEl.moveStart("character", selection.start);
      rangeEl.moveEnd("character", selection.end - selection.start);
      rangeEl.select();
    }
  } catch (e) {
    /* not focused or not visible */
  }
}

function supportArrowNavigation(mask) {
  return contract.isFunc(mask.arrowAction);
}

function asStr(anObj) {
  return JSON.stringify(anObj);
}

function eqSel(sel1, sel2) {
  if (sel1 === sel2) return true;
  if (sel1 === undefined || sel2 === undefined) return false;
  return sel1.start === sel2.start && sel1.end === sel2.end;
}

function selAt(sel, x) {
  if (!sel && x === 0) return true;
  return sel.start === x && (sel.end === undefined || sel.end === x);
}

const mapImg = {
  DONE: [
    <span className="glyphicon glyphicon-ok form-control-feedback"></span>,
    ""
  ],
  MORE: [
    <span className="glyphicon glyphicon-arrow-right form-control-feedback"></span>,
    " has-warning"
  ],
  OK: [
    <span className="glyphicon glyphicon-option-horizontal form-control-feedback"></span>,
    ""
  ]
};

//const LOG = (a, msg='') =>  { console.log(msg+": "+ a); return a; }
const LOG = x => x;
class RxStatus extends Component {
  render() {
    function printElem([code, typ]) {
      if (typ === undefined) return code;
      return <b>{code}</b>;
    }
    let t = this.props.mask.pattern.getInputTracker() || [];
    return <div>{t.map(printElem)}</div>;
  }
}

function minV(minVal) {
  return val => Math.max(minVal, val);
}

export function hashStr(str) {
  let hashVal = 5381,
    i = str.length;

  while (i) hashVal = (hashVal * 33) ^ str.charCodeAt(--i);
  return (hashVal >>> 0) + 12;
}

export class RxInputBase extends Component {
  constructor(props) {
    super(props);
    this.state = this.getInitialState();
    this._onChange = this._onChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyPress = this._onKeyPress.bind(this);
    this._onPaste = this._onPaste.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this.input = null;
  }
  // propTypes: {
  //   mask: React.PropTypes.object.isRequired,
  //   name: React.PropTypes.string.isRequired,
  //   popover: React.PropTypes.string,
  //   selection: React.PropTypes.object,
  //   value: React.PropTypes.string,
  // },

  // get input() {
  // 	return this.myRef.current;
  // }

  getInitialState() {
    let options = {
      pattern: this.props.mask || /.*/,
      value: this.props.value || ""
    };
    return {
      focus: false,
      value: this.props.value || "",
      selection: this.props.selection,
      mask: new RXInputMask(options)
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.mask.toString() !== nextProps.mask.toString()) {
      //this.state.mask.setPattern(nextProps.mask, {value: this.state.mask.getRawValue()});
      this.state.mask.setPattern(nextProps.mask, {
        value: nextProps.value,
        selection: this.state.mask.selection
      });
      this.setState({
        selection: this.state.selection,
        value: nextProps.value
      });
    } else if (this.props.value !== nextProps.value) {
      this.state.mask.setValue(nextProps.value);
    }
  }

  // static getDerivedStateFromProps(nextProps, state) {
  // 	//if (this.props.mask.toString() !== nextProps.mask.toString()) {
  //     let value = nextProps.value||'';
  //     console.log('getDerivedStateFromProps',{oldValue: state.value, value, oldmask:state.mask.pattern.toString(),mask: nextProps.mask.toString() });
  // 	if (state.mask.pattern.toString() !== nextProps.mask.toString()) {
  // 		//this.state.mask.setPattern(nextProps.mask, {value: this.state.mask.getRawValue()});
  // 		state.mask.setPattern(nextProps.mask, {value, selection: state.mask.selection});
  // 		//this.setState({ selection: this.state.selection, value: nextProps.value});
  // 		return {...state, value: nextProps.value};
  // 	}
  // 	else if (state.value !== value) {
  // 		state.mask.setValue(nextProps.value);
  // 		console.log("value change");
  // 		return {...state };
  // 	}
  // 	return null;
  // }

  _updateMaskSelection() {
    this.state.mask.selection = getSelection(this.input);
  }

  _updateInputSelection() {
    if (!eqSel(getSelection(this.input), this.state.mask.selection))
      setSelection(this.input, this.state.mask.selection);
  }

  _onFocus(e) {
    if (this.props.onFocus) this.props.onFocus(e);
  }

  _onBlur(e) {
    this.fireChange(e);
  }

  fireChange(e) {
    if (this.props.onChange) {
      let opt = {
        value: this.state.mask._getValue(),
        target: e.target,
        name: this.props.name,
        mask: this.state.mask
      };
      //this.props.onChange(opt);
      this.props.onChange({ target: opt });
    }
  }

  _onChange(e) {
    // console.log('onChange', asStr(getSelection(this.input)), e.target.value)
    const mask = this.state.mask;
    let maskValue = mask.getValue();
    if (e.target.value !== maskValue) {
      // Cut or delete operations will have shortened the value
      if (e.target.value.length < maskValue.length) {
        let sizeDiff = maskValue.length - e.target.value.length;
        this._updateMaskSelection();
        mask.selection.end = mask.selection.start + sizeDiff;
        mask.backspace();
        //console.log("Fix maskValue", maskValue, "diff:", sizeDiff, "target value: ", e.target.value);
      }
      let value = this._getDisplayValue();
      e.target.value = value;
      if (value) {
        this._updateInputSelection();
      }
    }
    this.setState({ selection: this.mask.selection });
    this.fireChange(e);
    // console.log("on change", e)
  }

  _onKeyDown(e) {
    const mask = this.state.mask;
    const isKey = keyV => e => e.key === keyV;

    const _C = (test, action) => {
      if (!test(e)) return false;
      e.preventDefault();
      this._updateMaskSelection();
      if (action()) {
        let oldVal = e.target.value;
        let value = this._getDisplayValue();
        e.target.value = value;
        //console.log(action+":getDisplayValue", value);
        if (value) {
          this._updateInputSelection();
        }
        if (this.props.onChange && oldVal != value) {
          //let opt = {target: {value: mask._getValue()}};
          //this.props.onChange(opt);
          this.fireChange(e);
          //console.log("on change", e)
        }
        // console.log("on change1", e)
      }
      this.setState({ selection: mask.selection });
      return true;
    };
    //console.log('onKeyDown',mask, asStr(getSelection(this.input))+"/"+asStr(mask.selection), e.key, e.keyCode, e.target.value)
    if (
      _C(isUndo, () => mask.undo()) ||
      _C(isRedo, () => mask.redo()) ||
      _C(isKey("Backspace"), () => mask.backspace()) ||
      _C(isKey("Delete"), () => mask.del())
    )
      return;

    if (
      e.metaKey ||
      e.altKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.key === "Enter" ||
      e.key === "Tab"
    ) {
      return;
    }
    if (e.key === "ArrowLeft" || e.key == "ArrowRight") {
      // Check if mask supports arrow support
      let sel = getSelection(this.input);
      //mask.selection = sel;
      if (sel.start === sel.end && mask.left !== undefined) {
        e.preventDefault();
        if (e.key === "ArrowLeft") mask.left(sel);
        else mask.right(sel);
        this._updateInputSelection();
        //this.refs.debug.props.forceUpdate();
      }

      //console.log("Arrow Action support:", supportArrowNavigation(mask), " value:",this._getDisplayValue(), " selection: ", asStr(getSelection(this.input)), asStr(mask.selection));
    }
  }

  _onKeyPress(e) {
    const mask = this.state.mask;
    //console.log('onKeyPress', asStr(getSelection(this.input)),asStr(mask.selection), e.key, e.target.value)

    // Ignore modified key presses
    // Ignore enter key to allow form submission
    if (e.metaKey || e.altKey || e.ctrlKey || e.key === "Enter") {
      return;
    }
    let selX = getSelection(this.input);
    let oldMaskX = mask.getSelection();
    e.preventDefault();
    this._updateMaskSelection();

    if (insert(e.key)) {
      let oldVal = e.target.value;
      let value = mask.getValue();
      e.target.value = value;
      //console.log("keyPress:getDisplayValue", this._getDisplayValue(),  " selection: ", asStr(selX)+"/"+asStr(mask.selection)+"<"+asStr(oldMaskX));
      this._updateInputSelection();
      this.setState({ selection: mask.selection });
      if (this.props.onChange && oldVal != value) {
        let opt = { target: { value: mask._getValue() } };
        this.props.onChange(opt);
      }
      //console.log("on change", e)
    }

    function insert(ch) {
      if (mask.input(ch)) return true;
      if (ch !== ch.toUpperCase()) return mask.input(ch.toUpperCase());
      else if (ch != ch.toLowerCase()) return mask.input(ch.toLowerCase());
      return false;
    }
  }

  _onPaste(e) {
    const mask = this.state.mask;
    //console.log('onPaste', asStr(getSelection(this.input)), e.clipboardData.getData('Text'), e.target.value)

    e.preventDefault();
    this._updateMaskSelection();
    // getData value needed for IE also works in FF & Chrome
    //console.log("paste: ", e.clipboardData.getData('Text'));
    if (mask.paste(e.clipboardData.getData("Text"))) {
      e.target.value = mask.getValue();
      //console.log("undo:getDisplayValue", this._getDisplayValue());
      // Timeout needed for IE
      setTimeout(this._updateInputSelection, 0);
      //this.props.onChange(e);
      this.setState({ selection: mask.selection });
    }
  }

  _getMaskList(flag) {
    const list = this.state.mask.minCharsList(!!flag);
    if (list && list.length < 20) return list;
    return this.state.mask.minCharsList();
  }

  _getDisplayValue() {
    let value = this.state.mask.getValue();
    return value === this.state.mask.emptyValue ? "" : value;
  }

  selected(str, e) {
    //console.log("Selected: "+str);
    if (!str.split("").find(c => (isMeta(c) ? c : undefined))) {
      const mask = this.state.mask;
      mask.setValue(str);
      this.setState({ mask: mask });
      //console.log("Selected(done): "+str);
    }
  }

  getMaxWidth(valueList, maxWidth, dflt = 200) {
    if (maxWidth) return Math.max(maxWidth, dflt);
    if (!valueList || !valueList.length) return dflt;
    const len = s => s.replace(/\u0332/g, "").length;
    let lenList = valueList.map(len).map(minV(20));
    return 12 * Math.max.apply(null, lenList);
  }

  getMapImg() {
    return mapImg;
  }
  getRxPlaceHolder() {
    return rxPlaceHolder;
  }
  getInput(input) {
    return input;
  }

  inputClassName() {
    return "form-control";
  }

  getPopoverData(valueList, headers, maxWidth, placeholder) {
    const MAXWIDTH = this.getMaxWidth(valueList, maxWidth, 300);

    if (!valueList || valueList.length <= 1) {
      if (!placeholder) return undefined;
      //{valueList: [""], headers, MAXWIDTH, hasSmallHeader: false} ;
      else valueList = [placeholder];
    }

    let val = this._getDisplayValue() || "";
    let ph = placeholder || this.state.mask.emptyValue;
    let popList = [val, ph].concat(valueList);

    let hasSmallHeader = popList.find(v => v.match(this.getRxPlaceHolder()));
    return { valueList, headers, MAXWIDTH, hasSmallHeader };
  }

  render() {
    let {
      mask,
      size,
      placeholder,
      popover,
      selection,
      showAll,
      ...props
    } = this.props;
    let patternLength = this.state.mask.pattern.length;

    const setRef = aDomElem => {
      this.input = aDomElem;
    };

    let input = (
      <input
        style={{ padding: "3px 0px 3px 0px", border: "none", outline: "none" }}
        className={this.inputClassName()}
        {...props}
        ref={setRef}
        maxLength={patternLength}
        onChange={this._onChange}
        onKeyDown={this._onKeyDown}
        onKeyPress={this._onKeyPress}
        onPaste={this._onPaste}
        onFocus={this._onFocus}
        onBlur={this._onBlur}
        placeholder={placeholder || this.state.mask.emptyValue}
        size={size || patternLength}
        value={this._getDisplayValue()}
      />
    );

    return this.getInput(input, placeholder);
  }
}

//const LOG = (first, ...params) => {console.log(first, ...params); return first; }
function strCmp1(a, b) {
  let nameA = a.toUpperCase(); // ignore upper and lowercase
  let nameB = b.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}

export class RxInput extends RxInputBase {
  _createPopover(props) {
    if (!props) return <span />;
    const { MAXWIDTH, hasSmallHeader, valueList, headers } = props;
    let smallHeader = hasSmallHeader
      ? (smallHeader = (
          <pre className="text-muted small-text">
            {convertMask("? - optional,   * - zero or more")}
          </pre>
        ))
      : "";
    const SPANSTYLE = { width: MAXWIDTH - 50, maxWidth: MAXWIDTH - 50 };
    let TS, PADDING;
    console.log("valueList", valueList);
    if (valueList.length > 20) {
      TS = { height: "400px", display: "block", overflow: "auto" };
      PADDING = (
        <div>
          {" "}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </div>
      );
    }
    let me = this;
    return (
      <Popover
        id={this.props.name + "myPopover"}
        className="col-xs-10 col-md-10"
        style={{
          width: MAXWIDTH,
          maxWidth: MAXWIDTH,
          fontSize: "10px",
          marginTop: "10px",
          marginBottom: "10px"
        }}
      >
        {smallHeader}
        <table
          key={this.props.name + "myPopover1"}
          className="table-responsive table-striped table-hover table-condensed col-xs-10 col-md-10"
          style={SPANSTYLE}
        >
          <thead>
            <tr>
              {headers.map(e => (
                <th key={this.props.name + e}>{e}</th>
              ))}
            </tr>
          </thead>
          <tbody style={TS}>
            {valueList.sort(strCmp1).map(l => (
              <tr
                onClick={e => me.selected(l, e)}
                key={this.props.name + "L" + hashStr(l)}
              >
                <td onClick={e => me.selected(l, e)}>{l}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {PADDING}
      </Popover>
    );
  }

  getInput(input, placeholder) {
    let OK;
    const warningStyle = {
      marginBotton: "0px",
      fontSize: "70%",
      color: "red",
      fontStyle: "italic"
    };
    let mapImg = this.getMapImg();
    //let status = <RxStatus mask={this.state.mask};
    let status = "";
    let popOverData = this.getPopoverData(
      this._getMaskList(this.props.showAll !== "no"),
      ["Possible Values"],
      undefined,
      placeholder
    );

    let myPopover = this.props.popover ? (
      this._createPopover(popOverData)
    ) : (
      <span />
    );
    let ok = this.state.mask.isDone();
    if (ok) OK = mapImg[this.state.mask.isDone()]; //<span className="input-group-addon">.00</span>;  //
    return (
      <div style={{ marginBotton: "0px" }}>
        <div className={"form-group has-feedback" + OK[1]}>{input}</div>
      </div>
    );
  }
}
