/* eslint-disable no-restricted-globals */
import { interpolate } from "flubber";

let interpolationFN: (t:number) => string;

self.onmessage = (event) => {
  const {message, old, current, moment} = event.data;
  
  // Execute the corresponding function based on the received identifier
  if (message == "Create Interpolate") {
    interpolationFN = interpolate(old, current, { maxSegmentLength: 1 });
    console.log("Create Interpolate")
    postMessage("Created Interpolate");
  } else if (message == "moment" && moment) {
    postMessage(interpolationFN(moment));
  }
};
