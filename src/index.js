import React, { render, Component } from "./react";

const root = document.getElementById("root");
const jsx = (
  <div>
    <p>Hello React</p>
    <p>Hello Fiber</p>
  </div>
);


// render(jsx, root);

// setTimeout(() => {
//   const jsx = (
//     <div>
//       <p>Hello React</p>
//       {/* <div>奥利给</div> */}
//     </div>
//   )
//   render(jsx, root)
// }, 2000)

class Greating extends Component {
  constructor (props) {
    super(props)
    this.state = {
      name: '张三'
    }
  }

  render() {
    return <div>
      {this.props.title}hahahahha {this.state.name}
      <button onClick={() => this.setState({name: '李四'})}>button</button>
    </div>
  }
}

render(<Greating title="12345" />, root)

function FnComponent (props) {
  return <div> {props.title}FnComponent</div>
}

// render(<FnComponent title="Hello"></FnComponent>, root)
