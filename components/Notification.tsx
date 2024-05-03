import React, { memo, forwardRef } from "react";
import Zoom from "@mui/material/Zoom";
import { Card, CardBody } from "@nextui-org/react";

const NotificationContent = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; style?: React.CSSProperties }
>(({ children, style }, ref) => (
  <div ref={ref} style={style}>
    <Card>
      <CardBody>{children}</CardBody>
    </Card>
  </div>
));

const NotificationComponent = memo(
  ({ children, isVisible }: { children: React.ReactNode; isVisible: boolean }) => (
    <div
      className={`fixed w-auto h-[10vh] z-50 top-[3vw] left-[3vw] ${
        isVisible ? "visible" : "invisible"
      }`}
    >
      <Zoom in={isVisible}>
        <NotificationContent>{children}</NotificationContent>
      </Zoom>
    </div>
  )
);

export default NotificationComponent;