import { updateNodeElement } from "../DOM";
import {
  createTaskQueue,
  arrified,
  createStateNode,
  getTag,
  getRoot,
} from "../Misc";
const taskQueue = createTaskQueue()

let subTask = null
let pendingCommit = null

const commitAllWork = fiber => {
  fiber.effects.forEach(item => {
    if (item.tag === 'class_component') {
      item.stateNode.__fiber = item;
    }
    if (item.effectTag === 'delete') {
      item.parent.stateNode.removeChild(item.stateNode)
    }
    if (item.effectTag === 'update') {
      // 节点类型想通
      if (item.type === item.alternate.type) {
        // 节点类型相同
        updateNodeElement(item.stateNode, item, item.alternate)
      } else {
        // 节点类型不同
        item.parent.stateNode.replaceChild(
          item.stateNode,
          item.alternate.stateNode
        )
      }
    }
    if (item.effectTag === 'placement') {
      let fiber = item
      let parentFiber = item.parent
      while (
        parentFiber.tag === "class_component" ||
        parentFiber.tag === "function_component"
      ) {
        parentFiber = parentFiber.parent;
      }
      if (fiber.tag === "host_component") {
        parentFiber.stateNode.appendChild(fiber.stateNode);
      }
    }
  })
  /**
   * 备份旧的 fiber 节点对象
   */
  fiber.stateNode.__rootFiberContainer = fiber;

}


const getFirstTask = () => {
  const task = taskQueue.pop();
  if (task.from === 'class_component') {
    const root = getRoot(task.instance);
    task.instance.__fiber.partialState = task.partialState
    return {
      props: root.props,
      stateNode: root.stateNode,
      tag: "host_root",
      effects: [],
      child: null,
      alternate: root,
    };
  }
  return {
    props: task.props,
    stateNode: task.dom,
    tag: "host_root",
    effects: [],
    child: null,
    alternate: task.dom.__rootFiberContainer
  }
}

const reconcileChildren = (fiber, children) => {
  const arrifiedChildren = arrified(children)

  let index = 0;
  let numberOfElements = arrifiedChildren.length;
  let element = null
  let newFiber = null
  let prevFiber = null

  let alternate = null
  if (fiber.alternate && fiber.alternate.child) {
    alternate = fiber.alternate.child;
  }

  while (index < numberOfElements || alternate) {
    element = arrifiedChildren[index];
    
    if (!element && alternate) {
      // 删除
      alternate.effectTag = "delete"
      fiber.effects.push(alternate)
    }
    else if (element && alternate) {
      /**
       *  更新
       */
      newFiber = {
        type: element.type,
        props: element.props,
        tag: getTag(element),
        effects: [],
        effectTag: "update",
        // stateNode: null,
        parent: fiber,
        alternate
      };
      // 类型相同
      if (element.type === alternate.type) {
        newFiber.stateNode = alternate.stateNode
      }
      // 类型不同 
      else {
        newFiber.stateNode = createStateNode(newFiber);
      }
    }
    else if (element && !alternate) {
      newFiber = {
        type: element.type,
        props: element.props,
        tag: getTag(element),
        effects: [],
        effectTag: "placement",
        // stateNode: null,
        parent: fiber,
      };
      newFiber.stateNode = createStateNode(newFiber);
    }
    
    if (index === 0) {
      fiber.child = newFiber;
    } else if (element) {
      prevFiber.sibling = newFiber;
    }
    if (alternate && alternate.sibling) {
      alternate = alternate.sibling
    } else {
      alternate = null
    }

    prevFiber = newFiber;
    index++;
  }
}

const executeTask = fiber => {

  if (fiber.tag === 'class_component') {
    if (fiber.stateNode.__fiber && fiber.stateNode.__fiber.partialState) {
      fiber.stateNode.state = {
        ...fiber.stateNode.state,
        ...fiber.stateNode.__fiber.partialState,
      };
    } 
    reconcileChildren(fiber, fiber.stateNode.render());
  } else if (fiber.tag === 'function_component') {
    reconcileChildren(fiber, fiber.stateNode(fiber.props));
  } else {
    reconcileChildren(fiber, fiber.props.children);
  }

  if (fiber.child) {
    return fiber.child
  }
  let currentExecutelyFiber = fiber;
  while (currentExecutelyFiber.parent) {
    currentExecutelyFiber.parent.effects =
      currentExecutelyFiber.parent.effects.concat(
        currentExecutelyFiber.effects.concat([currentExecutelyFiber])
      );

    if (currentExecutelyFiber.sibling) {
      return currentExecutelyFiber.sibling;
    }
    currentExecutelyFiber = currentExecutelyFiber.parent
  }
  pendingCommit = currentExecutelyFiber;
}

const workLoop = deadline => {
  if (!subTask) {
    subTask = getFirstTask()
  }
  while (subTask && deadline.timeRemaining() > 1) {
    subTask = executeTask(subTask)
  }
  if (pendingCommit) {
    commitAllWork(pendingCommit)
  }
}

const preformTask = deadline => {
  workLoop(deadline);
  if (subTask || !taskQueue.isEmpty()) {
    requestIdleCallback(preformTask)
  }
}
export const render =  (element, dom) => {
  /**
   * 1. 向任务队列中添加任务
   * 2. 指定在浏览器空闲时执行任务
   */

  /**
   * 任务就是通过 vdom 对象构建 fiber 对象
   *    
   */

  taskQueue.push({
    dom,
    props: {
      children: element
    }
  })

  requestIdleCallback(preformTask)
}

export const scheduleUpdate = (instance, partialState) => {
  taskQueue.push({ 
    from: "class_component",
    instance,
    partialState
  })
  requestIdleCallback(preformTask);
}
