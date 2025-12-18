import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRouter from './routes/users';
import databasesRouter from './routes/databases';
import authRouter from './routes/auth';
import captchaRouter from './routes/captcha';
import ordersRouter from './routes/orders';
import userRouter from './routes/user';
import rechargeConfigRouter from './routes/rechargeConfig';
import rechargesRouter from './routes/recharges';
import commissionRateRouter from './routes/commissionRate';
import productPriceConfigRouter from './routes/productPriceConfig';
import productsRouter from './routes/products';
import injectionPlansRouter from './routes/injectionPlans';
import withdrawsRouter from './routes/withdraws';
import supportRouter from './routes/support';
import subUsersRouter from './routes/subUsers';

dotenv.config();

const app = express();

app.use(cors());
// 增加请求体大小限制，支持大图片上传（50MB）
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/users', usersRouter);
app.use('/databases', databasesRouter);
app.use('/auth', authRouter);
app.use('/captcha', captchaRouter);
app.use('/orders', ordersRouter);
app.use('/user', userRouter);
app.use('/recharge-config', rechargeConfigRouter);
app.use('/recharges', rechargesRouter);
app.use('/commission-rate', commissionRateRouter);
app.use('/product-price-config', productPriceConfigRouter);
app.use('/products', productsRouter);
app.use('/injection-plans', injectionPlansRouter);
app.use('/withdraws', withdrawsRouter);
app.use('/support', supportRouter);
app.use('/sub-users', subUsersRouter);

// 基础错误处理
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(400).json({ message: err?.message ?? 'Unexpected error' });
});

export default app;

